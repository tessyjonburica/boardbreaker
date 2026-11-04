export type ComponentType =
  | "resistor"
  | "capacitor"
  | "diode"
  | "led"
  | "fuse"
  | "regulator"
  | "ic"
  | "connector"
  | "switch"
  | "crystal"
  | "trace"
  | "testpoint";

export interface Footprint {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
}

export interface ComponentParams {
  resistance?: number;
  vf?: number;
  vtarget?: number;
  dropout?: number;
  currentLimit?: number;
  quiescent?: number;
  load?: number;
  closed?: boolean;
}

export interface ComponentSpec {
  id: string;
  ref: string;
  type: ComponentType;
  value?: string;
  pins: Record<string, string>;
  params?: ComponentParams;
  footprint?: Footprint;
  section?: string;
}

export interface TestPoint {
  id: string;
  label: string;
  node: string;
  footprint?: Footprint;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  components: ComponentSpec[];
  testPoints: TestPoint[];
  source: {
    node: string;
    voltage: number;
    seriesResistance: number;
  };
  groundNode: string;
}

export interface SolveResult {
  voltages: Record<string, number>;
  /** Current through each two-terminal component, positive pin1 -> pin2, amps. */
  currents: Record<string, number>;
  converged: boolean;
  iterations: number;
}

export interface Reading {
  id: string;
  kind: "voltage" | "resistance";
  node: string;
  label: string;
  value: number;
  unit: "V" | "ohm";
  /** True when an ohmmeter sees no DC path (compliance limit reached). */
  open?: boolean;
}

export type FaultMode = "open" | "short" | "value" | "reverse";

export interface Fault {
  id: string;
  label: string;
  description: string;
  componentId: string;
  mode: FaultMode;
  value?: number;
  expectedSuspects: string[];
  symptom: string;
  /** true when the rails stay healthy and only behaviour (enumeration, boot) shows it */
  symptomOnly?: boolean;
}
