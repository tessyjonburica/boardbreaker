import type { Board, ComponentSpec, Reading } from "./types.js";
import { solveBoard } from "./solver.js";

export function measureVoltage(board: Board, components: ComponentSpec[], node: string): Reading {
  const solved = solveBoard(board, components, { powered: true });
  const value = node === board.groundNode ? 0 : solved.voltages[node] ?? 0;
  return {
    id: `V:${node}`,
    kind: "voltage",
    node,
    label: `Voltage at ${node}`,
    value: round(Math.abs(value) < 1e-6 ? 0 : value, 3),
    unit: "V",
  };
}

export function measureResistance(board: Board, components: ComponentSpec[], node: string): Reading {
  if (node === board.groundNode) {
    return { id: `R:${node}`, kind: "resistance", node, label: `Resistance to GND at ${node}`, value: 0, unit: "ohm" };
  }
  const solved = solveBoard(board, components, {
    powered: false,
    probeNode: node,
    probeVoltage: 1,
    probeSeries: 1000,
  });
  const v = solved.voltages[node] ?? 0;
  const isrc = (1 - v) / 1000;
  const open = isrc < 5e-8;
  const r = open ? 1e9 : v / isrc;
  return {
    id: `R:${node}`,
    kind: "resistance",
    node,
    label: `Resistance to GND at ${node}`,
    value: round(Math.max(0, r), 1),
    unit: "ohm",
    open,
  };
}

export function allVoltages(board: Board, components: ComponentSpec[]): Record<string, number> {
  const solved = solveBoard(board, components, { powered: true });
  const out: Record<string, number> = {};
  for (const tp of board.testPoints) out[tp.id] = round(solved.voltages[tp.node] ?? 0, 3);
  return out;
}

export function allResistances(board: Board, components: ComponentSpec[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const tp of board.testPoints) out[tp.id] = measureResistance(board, components, tp.node).value;
  return out;
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
