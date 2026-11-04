import type { Board, ComponentParams, ComponentSpec, ComponentType, TestPoint } from "../bench/types.js";
import type { Netlist, NetlistComponent } from "./kicad.js";

/** A pin role assigned to a physical pin number of a real part. */
export interface PinRoles {
  A?: string;
  K?: string;
  IN?: string;
  OUT?: string;
  VCC?: string;
  GND?: string;
  [role: string]: string | undefined;
}

/**
 * Per-board board support package. Real boards ship a profile like this: which
 * parts take part in the DC model, what role each pin plays, and which nets are
 * the rails we can probe. Everything not listed falls back to a value-based
 * default (resistors are resistors, capacitors are open at DC).
 */
export interface PartOverride {
  ref: string;
  /** override the class derived from the reference designator */
  role?: ComponentType;
  /** role -> pin number */
  pins?: PinRoles;
  params?: ComponentParams;
  /** override the parsed value, e.g. a resistor measured off the schematic */
  resistance?: number;
  /** leave the part out of the electrical model entirely */
  skip?: boolean;
}

export interface ProbePoint {
  id: string;
  label: string;
  net: string;
}

export interface BoardProfile {
  id: string;
  name: string;
  description: string;
  /** where the external supply is attached */
  source: { net: string; voltage: number; seriesResistance: number };
  groundNet: string;
  /** readable name -> net name as written in the netlist */
  nets?: Record<string, string>;
  /** only parts listed in `parts` are electrically modelled */
  strict?: boolean;
  parts: PartOverride[];
  probes: ProbePoint[];
}

const MULTIPLIERS: Record<string, number> = {
  m: 1e-3,
  R: 1,
  r: 1,
  k: 1e3,
  K: 1e3,
  M: 1e6,
  G: 1e9,
};

/**
 * Reads "220k/R0402", "49.9k/1%/R0402", "220R", "0.5R/1%" into ohms.
 * Returns undefined for "NA", "DNP" and anything without a number.
 */
export function parseResistance(value: string): number | undefined {
  const head = value.split("/")[0].trim();
  if (!head || /^(NA|DNP|NM|N\/A)$/i.test(head)) return undefined;
  const m = head.match(/^(\d+(?:\.\d+)?)\s*([mRrkKMG]?)$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return undefined;
  return n * (MULTIPLIERS[m[2]] ?? 1);
}

/** Typical forward drop by part family, used when the value has no hint. */
export function diodeVf(value: string): number {
  const v = value.toUpperCase();
  if (/1N5819|SS14|SS34|BAT54|1N4148W/.test(v)) return v.includes("BAT54") ? 0.3 : 0.3;
  if (/LED/.test(v)) {
    if (/RED/.test(v)) return 1.9;
    if (/GREEN/.test(v)) return 2.1;
    if (/BLUE|WHITE/.test(v)) return 2.9;
    if (/YELLOW|ORANGE/.test(v)) return 2.0;
    return 2.0;
  }
  return 0.7;
}

function defaultRole(comp: NetlistComponent): ComponentType | undefined {
  const ref = comp.ref.toUpperCase();
  if (/^R\d/.test(ref)) return "resistor";
  if (/^C\d/.test(ref)) return "capacitor";
  if (/^L\d/.test(ref)) return "trace";
  if (/^F\d/.test(ref)) return "fuse";
  if (/^D\d/.test(ref)) return /LED/i.test(comp.value) ? "led" : "diode";
  if (/^SW\d/.test(ref)) return "switch";
  if (/^Y\d|^X\d/.test(ref)) return "crystal";
  if (/^J\d|^P\d|^EXT\d|USB/.test(ref)) return "connector";
  if (/TESTPAD|^TP\d/.test(ref)) return "testpoint";
  if (/^U\d/.test(ref)) return "ic";
  return undefined;
}

function sortedPinNumbers(comp: NetlistComponent): string[] {
  return Object.keys(comp.pins).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Builds the DC model of a real board from its KiCad netlist plus a profile.
 * Only parts that carry current at DC are included; the rest still appear in
 * the netlist handed to the reasoning agent.
 */
export function buildBoard(netlist: Netlist, profile: BoardProfile): { board: Board; components: ComponentSpec[] } {
  const overrides = new Map(profile.parts.map((p) => [p.ref, p]));
  const components: ComponentSpec[] = [];

  for (const comp of netlist.components) {
    const ov = overrides.get(comp.ref);
    if (ov?.skip) continue;
    if (profile.strict && !ov) continue;
    const role = ov?.role ?? defaultRole(comp);
    if (!role) continue;

    const pins: Record<string, string> = {};
    const numbers = sortedPinNumbers(comp);
    /** pin number -> net name, only if the pin is actually connected */
    const netOf = (pinNumber?: string) => (pinNumber ? comp.pins[pinNumber] : undefined);

    if (role === "regulator" || role === "ic") {
      for (const [roleName, pinNumber] of Object.entries(ov?.pins ?? {})) {
        const net = netOf(pinNumber);
        if (net) pins[roleName] = net;
      }
      // A multi-pin part with no explicit roles is not electrically modellable.
      if (!Object.keys(pins).length) continue;
    } else if (role === "diode" || role === "led") {
      const a = netOf(ov?.pins?.A) ?? netOf(numbers[1]);
      const k = netOf(ov?.pins?.K) ?? netOf(numbers[0]);
      if (!a || !k) continue;
      pins.A = a;
      pins.K = k;
    } else if (role === "switch") {
      const p1 = netOf(ov?.pins?.["1"]) ?? netOf(numbers[0]);
      const p2 = netOf(ov?.pins?.["2"]) ?? netOf(numbers[1]);
      if (!p1 || !p2) continue;
      pins["1"] = p1;
      pins["2"] = p2;
    } else {
      const p1 = netOf(ov?.pins?.["1"]) ?? netOf(numbers[0]);
      const p2 = netOf(ov?.pins?.["2"]) ?? netOf(numbers[1]);
      if (!p1 || !p2) continue;
      pins["1"] = p1;
      pins["2"] = p2;
    }

    const params: ComponentParams = { ...(ov?.params ?? {}) };
    if (role === "resistor" || role === "fuse" || role === "trace") {
      const parsed = parseResistance(comp.value);
      // A part marked NA/DNP is not fitted, so it is an open circuit.
      if (parsed === undefined && ov?.resistance === undefined && /^(NA|DNP|NM|N\/A)$/i.test(comp.value.split("/")[0].trim())) {
        continue;
      }
      const r = ov?.resistance ?? parsed ?? (role === "fuse" ? 0.05 : 1);
      if (!Number.isFinite(r) || r < 0) continue;
      params.resistance = r;
    }
    if (role === "diode" || role === "led") {
      params.vf = params.vf ?? diodeVf(comp.value);
      params.resistance = params.resistance ?? (role === "led" ? 12 : 0.15);
    }

    components.push({
      id: comp.ref,
      ref: comp.ref,
      type: role,
      value: comp.value,
      pins,
      params,
      section: role,
    });
  }

  const alias = new Map(Object.entries(profile.nets ?? {}).map(([readable, real]) => [real, readable]));
  const rename = (net: string) => alias.get(net) ?? net;
  if (alias.size) {
    for (const c of components) {
      for (const [role, pin] of Object.entries(c.pins)) {
        c.pins[role] = rename(c.pins[role]);
      }
    }
  }

  const testPoints: TestPoint[] = profile.probes.map((p, i) => ({
    id: p.id || `TP${i + 1}`,
    label: p.label,
    node: rename(p.net),
  }));

  const board: Board = {
    id: profile.id,
    name: profile.name,
    description: profile.description,
    components,
    testPoints,
    source: {
      node: rename(profile.source.net),
      voltage: profile.source.voltage,
      seriesResistance: profile.source.seriesResistance,
    },
    groundNode: rename(profile.groundNet),
  };

  return { board, components };
}
