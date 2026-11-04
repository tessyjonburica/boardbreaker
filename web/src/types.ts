export type Footprint = { x: number; y: number; w: number; h: number };

export type TestPoint = {
  id: string;
  label: string;
  node: string;
  footprint: Footprint;
};

export type Component = {
  id: string;
  ref: string;
  type: string;
  value: string;
  footprint?: Footprint;
};

export type BoardState = {
  board: {
    id: string;
    name: string;
    description: string;
    testPoints: TestPoint[];
    components: Component[];
  };
  map: { components: { ref: string; type: string; value: string }[] };
  faults: { id: string; label: string; symptom: string }[];
};

export type Probe = {
  node: string;
  kind: "voltage" | "resistance";
  value: number;
  unit: string;
  open: boolean;
  why: string;
};

export type Suspect = { ref: string; confidence: number; reason: string; solver?: string[] };

export type Final = {
  result: {
    ranked: Suspect[];
    summary: string;
    verified?: { faultId: string; label: string; expected: string[]; score: number }[];
  };
  expected: string[];
};

export const W = 1300;
export const H = 960;
export const BUDGET = 6;

export function fmt(p: Probe): string {
  if (p.open) return "OL";
  if (p.kind === "resistance") {
    if (p.value >= 1e6) return `${(p.value / 1e6).toFixed(2)} MΩ`;
    if (p.value >= 1e3) return `${(p.value / 1e3).toFixed(1)} kΩ`;
    return `${Math.round(p.value)} Ω`;
  }
  return `${p.value.toFixed(3)} V`;
}

export function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
