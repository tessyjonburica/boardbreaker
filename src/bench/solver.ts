import type { Board, ComponentSpec, SolveResult } from "./types.js";

const EPS = 1e-12;
const GND = "GND";

interface Edge {
  a: number;
  b: number;
  g: number;
  i: number; // current injected into a, out of b
}

/**
 * Solves the DC operating point of a board using modified nodal analysis.
 * All elements are stamped as conductance + Norton current source, so the
 * matrix is well conditioned and regulators/diodes can be iterated.
 */
export function solveBoard(
  board: Board,
  components: ComponentSpec[],
  opts: {
    powered: boolean;
    probeNode?: string;
    probeCurrent?: number;
    probeVoltage?: number;
    probeSeries?: number;
  } = { powered: true },
): SolveResult {
  const nodeSet = new Set<string>();
  for (const c of components) for (const n of Object.values(c.pins)) nodeSet.add(n);
  nodeSet.add(board.source.node);
  nodeSet.add(GND);
  nodeSet.delete(GND);
  const nodes = [...nodeSet];
  const index = new Map(nodes.map((n, i) => [n, i]));
  const n = nodes.length;

  const diodeOn = new Map<string, boolean>();
  for (const c of components) {
    if (c.type === "diode" || c.type === "led") diodeOn.set(c.id, true);
  }
  const regTarget = new Map<string, number>();
  for (const c of components) {
    if (c.type === "regulator") regTarget.set(c.id, c.params?.vtarget ?? 0);
  }

  let voltages = new Array(n).fill(0);
  let converged = false;
  let iterations = 0;

  for (let iter = 0; iter < 80; iter++) {
    iterations = iter + 1;
    const G = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    const I = new Array<number>(n).fill(0);

    const addG = (a: number, b: number, g: number) => {
      if (a >= 0) G[a][a] += g;
      if (b >= 0) G[b][b] += g;
      if (a >= 0 && b >= 0) {
        G[a][b] -= g;
        G[b][a] -= g;
      }
    };
    const addI = (a: number, b: number, i: number) => {
      if (a >= 0) I[a] += i;
      if (b >= 0) I[b] -= i;
    };
    const node = (name: string) => (name === GND ? -1 : index.get(name) ?? -1);

    // 10M bleed to ground: keeps isolated nets solvable and makes a floating
    // rail read 0V like a real multimeter would, instead of latching at a
    // diode threshold.
    for (let i = 0; i < n; i++) G[i][i] += 1e-7;

    if (opts.powered) {
      const src = board.source;
      const s = node(src.node);
      const g = 1 / Math.max(src.seriesResistance, 1e-3);
      addG(s, -1, g);
      addI(s, -1, src.voltage * g);
    } else if (opts.probeNode && opts.probeNode !== GND) {
      if (opts.probeVoltage !== undefined) {
        // Thevenin probe: Vsrc through Rs. Keeps the test voltage inside meter
        // compliance so a floating net cannot blow up the solve.
        const rs = Math.max(opts.probeSeries ?? 1000, 1e-3);
        const pn = node(opts.probeNode);
        addG(pn, -1, 1 / rs);
        addI(pn, -1, opts.probeVoltage / rs);
      } else {
        addI(node(opts.probeNode), -1, opts.probeCurrent ?? 1e-3);
      }
    }

    for (const c of components) {
      const p = c.pins;
      switch (c.type) {
        case "resistor":
        case "fuse":
        case "trace": {
          const r = Math.max(c.params?.resistance ?? 1, 1e-4);
          addG(node(p[1]), node(p[2]), 1 / r);
          break;
        }
        case "capacitor":
        case "crystal":
        case "connector":
        case "testpoint":
          break;
        case "switch": {
          if (c.params?.closed) {
            addG(node(p[1]), node(p[2]), 1 / Math.max(c.params.resistance ?? 0.1, 1e-4));
          }
          break;
        }
        case "diode":
        case "led": {
          if (!diodeOn.get(c.id)) break;
          const vf = c.params?.vf ?? 0.7;
          const g = 1 / Math.max(c.params?.resistance ?? 0.1, 1e-4);
          const a = node(p.A);
          const k = node(p.K);
          addG(a, k, g);
          addI(a, k, g * vf);
          break;
        }
        case "regulator": {
          const target = regTarget.get(c.id) ?? 0;
          if (target > 0) {
            const g = 1 / Math.max(c.params?.resistance ?? 0.2, 1e-4);
            addG(node(p.OUT), -1, g);
            addI(node(p.OUT), -1, target * g);
          }
          // Quiescent current only flows when the part is actually powered.
          const vin = voltages[node(p.IN)] ?? 0;
          if (vin > 1.0) addI(node(p.IN), -1, -(c.params?.quiescent ?? 0.005));
          break;
        }
        case "ic": {
          const load = Math.max(c.params?.load ?? 250, 0.1);
          addG(node(p.VCC), node(p.GND), 1 / load);
          break;
        }
      }
    }

    const next = solveLinear(G, I);
    if (!next) break;

    let maxDelta = 0;
    for (let i = 0; i < n; i++) maxDelta = Math.max(maxDelta, Math.abs(next[i] - voltages[i]));
    voltages = next;
    if (maxDelta < 1e-6 && iter > 2) {
      converged = true;
      break;
    }

    let changed = false;
    for (const c of components) {
      if (c.type === "diode" || c.type === "led") {
        const a = node(c.pins.A);
        const k = node(c.pins.K);
        const vd = (a >= 0 ? voltages[a] : 0) - (k >= 0 ? voltages[k] : 0);
        const vf = c.params?.vf ?? 0.7;
        const g = 1 / Math.max(c.params?.resistance ?? 0.1, 1e-4);
        const on = diodeOn.get(c.id) ?? true;
        const current = on ? g * (vd - vf) : 0;
        if (on && current < -1e-12) {
          diodeOn.set(c.id, false);
          changed = true;
        } else if (!on && vd > vf + 1e-6) {
          diodeOn.set(c.id, true);
          changed = true;
        }
      }
      if (c.type === "regulator") {
        const vin = voltages[node(c.pins.IN)] ?? 0;
        const vout = voltages[node(c.pins.OUT)] ?? 0;
        const vtarget = c.params?.vtarget ?? 0;
        const dropout = c.params?.dropout ?? 1.1;
        const rout = Math.max(c.params?.resistance ?? 0.2, 1e-4);
        const limit = c.params?.currentLimit ?? 0.8;
        let desired = vtarget;
        if (vin < vtarget + dropout) desired = Math.max(0, vin - dropout);
        const iout = (desired - vout) / rout;
        if (iout > limit) desired = Math.max(0, vout + limit * rout);
        if (Math.abs(desired - (regTarget.get(c.id) ?? 0)) > 1e-6) {
          regTarget.set(c.id, desired);
          changed = true;
        }
      }
    }
    if (!changed && maxDelta < 1e-5) {
      converged = true;
      break;
    }
  }

  const result: SolveResult = { voltages: {}, currents: {}, converged, iterations };
  for (const [name, i] of index) result.voltages[name] = voltages[i];
  result.voltages[GND] = 0;

  for (const c of components) {
    const v = (name: string) => (name === GND ? 0 : result.voltages[name] ?? 0);
    switch (c.type) {
      case "resistor":
      case "fuse":
      case "trace": {
        result.currents[c.id] = (v(c.pins[1]) - v(c.pins[2])) / Math.max(c.params?.resistance ?? 1, 1e-4);
        break;
      }
      case "diode":
      case "led": {
        const on = diodeOn.get(c.id) ?? false;
        const vf = c.params?.vf ?? 0.7;
        const g = 1 / Math.max(c.params?.resistance ?? 0.1, 1e-4);
        result.currents[c.id] = on ? g * (v(c.pins.A) - v(c.pins.K) - vf) : 0;
        break;
      }
      case "regulator": {
        const target = regTarget.get(c.id) ?? 0;
        const rout = Math.max(c.params?.resistance ?? 0.2, 1e-4);
        result.currents[c.id] = target > 0 ? (target - v(c.pins.OUT)) / rout : 0;
        break;
      }
      case "ic": {
        result.currents[c.id] = v(c.pins.VCC) / Math.max(c.params?.load ?? 250, 0.1);
        break;
      }
      default:
        result.currents[c.id] = 0;
    }
  }
  return result;
}

/** Gaussian elimination with partial pivoting. */
export function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-15) return null;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    const pv = m[col][col];
    for (let j = col; j <= n; j++) m[col][j] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r][col];
      if (Math.abs(f) < 1e-18) continue;
      for (let j = col; j <= n; j++) m[r][j] -= f * m[col][j];
    }
  }
  return m.map((row) => row[n]);
}
