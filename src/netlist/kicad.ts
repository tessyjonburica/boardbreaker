import { atom, child, children, parseSexpr } from "./sexpr.js";

export interface NetlistComponent {
  ref: string;
  value: string;
  footprint: string;
  /** library part name, e.g. "R", "ESP32-WROOM-32D" */
  part: string;
  /** pin number -> net name */
  pins: Record<string, string>;
}

export interface NetlistNet {
  name: string;
  /** every pin on this net */
  nodes: { ref: string; pin: string }[];
}

export interface Netlist {
  title: string;
  rev: string;
  tool: string;
  components: NetlistComponent[];
  nets: NetlistNet[];
}

/** KiCad stores some net names quoted with a leading slash or as Net-(REF-PadN). */
export function cleanNetName(raw: string): string {
  let name = raw.trim();
  if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1);
  if (name.startsWith("/") && name.length > 1) name = name.slice(1);
  return name;
}

export function parseKicadNetlist(text: string): Netlist {
  const tree = parseSexpr(text);
  const root = tree.find((item) => Array.isArray(item) && item[0] === "export");
  if (!root) throw new Error("not a KiCad netlist: missing (export ...)");

  const top = root as import("./sexpr.js").Sexpr[];
  const design = child(top, "design") ?? [];
  const sheet = child(design, "sheet") ?? [];
  const titleBlock = child(sheet, "title_block") ?? child(design, "title_block") ?? [];

  const components: NetlistComponent[] = [];
  const compsBlock = child(top, "components") ?? [];
  for (const comp of children(compsBlock, "comp")) {
    const ref = atom(comp, "ref");
    if (!ref) continue;
    const libsource = child(comp, "libsource") ?? [];
    components.push({
      ref,
      value: atom(comp, "value"),
      footprint: atom(comp, "footprint"),
      part: atom(libsource, "part") || ref.replace(/[0-9]+$/, ""),
      pins: {},
    });
  }

  const nets: NetlistNet[] = [];
  const netsBlock = child(top, "nets") ?? [];
  for (const net of children(netsBlock, "net")) {
    const name = cleanNetName(atom(net, "name"));
    const nodes: { ref: string; pin: string }[] = [];
    for (const node of children(net, "node")) {
      const ref = atom(node, "ref");
      const pin = atom(node, "pin");
      if (ref && pin) nodes.push({ ref, pin });
    }
    nets.push({ name, nodes });
  }

  const byRef = new Map(components.map((c) => [c.ref, c]));
  for (const net of nets) {
    for (const node of net.nodes) {
      const comp = byRef.get(node.ref);
      if (comp) comp.pins[node.pin] = net.name;
    }
  }

  return {
    title: atom(titleBlock, "title") || "untitled",
    rev: atom(titleBlock, "rev"),
    tool: atom(design, "tool"),
    components,
    nets,
  };
}

/** Components grouped by their value prefix, useful for quick sanity reports. */
export function refClass(ref: string): string {
  return (ref.match(/^[A-Za-z_]+/)?.[0] ?? "").toUpperCase();
}
