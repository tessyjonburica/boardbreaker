import type { Board, ComponentSpec, Fault, Reading } from "../bench/types.js";
import { measureResistance, measureVoltage } from "../bench/readings.js";
import { applyFault, FAULTS } from "../bench/faults.js";

export interface Probe {
  kind: "voltage" | "resistance";
  node: string;
}

/** The default bench sweep. A real agent gets a smaller budget and chooses. */
export const FULL_SWEEP: Probe[] = [
  { kind: "voltage", node: "VIN_RAW" },
  { kind: "voltage", node: "VIN_F" },
  { kind: "voltage", node: "VIN_D" },
  { kind: "voltage", node: "5V_REG" },
  { kind: "voltage", node: "5V" },
  { kind: "voltage", node: "3V3" },
  { kind: "voltage", node: "RESET" },
  { kind: "voltage", node: "LED_A" },
  { kind: "voltage", node: "LED3_A" },
  { kind: "resistance", node: "VIN_D" },
  { kind: "resistance", node: "5V_REG" },
  { kind: "resistance", node: "5V" },
  { kind: "resistance", node: "3V3" },
  { kind: "resistance", node: "LED_A" },
  { kind: "resistance", node: "LED3_A" },
];

export function takeReadings(board: Board, components: ComponentSpec[], probes: Probe[]): Reading[] {
  return probes.map((p) =>
    p.kind === "voltage"
      ? measureVoltage(board, components, p.node)
      : measureResistance(board, components, p.node),
  );
}

export function signature(board: Board, components: ComponentSpec[], probes: Probe[]): number[] {
  return takeReadings(board, components, probes).map((r) => r.value);
}

/** Distance between two reading vectors, log-scaled so 0.01 vs 10k is not dominant. */
export function distance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Math.max(0, a[i]);
    const y = Math.max(0, b[i]);
    if (x < 0.05 && y < 0.05) {
      sum += Math.abs(x - y);
    } else {
      sum += Math.abs(Math.log10(1 + x) - Math.log10(1 + y));
    }
  }
  return sum;
}

export interface Candidate {
  fault: Fault;
  score: number;
}

/**
 * Simulation-based diagnosis: score every known fault mode by how well its
 * predicted readings match the observed ones. This is the benchmark's strong
 * baseline and the agent's fallback when the model is unavailable.
 */
export function diagnoseBySimulation(
  board: Board,
  probes: Probe[],
  observed: number[],
  candidates: Fault[] = FAULTS,
): Candidate[] {
  return candidates
    .map((fault) => {
      const predicted = signature(board, applyFault(board, fault), probes);
      return { fault, score: distance(predicted, observed) };
    })
    .sort((x, y) => x.score - y.score);
}
