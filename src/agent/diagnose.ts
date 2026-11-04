import type { Board, Fault, Reading } from "../bench/types.js";
import { applyFault } from "../bench/faults.js";
import { measureResistance, measureVoltage } from "../bench/readings.js";
import { metaJson } from "../vision/client.js";
import { extractText } from "../vision/map.js";
import type { ComponentMap } from "../vision/map.js";
import { diagnoseBySimulation } from "../eval/baseline.js";

export interface AgentStep {
  probe: string;
  value: number;
  unit: string;
  why?: string;
  kind?: "voltage" | "resistance";
  node?: string;
  open?: boolean;
}

export interface Suspect {
  ref: string;
  confidence: number;
  reason: string;
  /** Fault ids whose simulated signature matches the probes exactly. */
  solver?: string[];
}

export interface AgentResult {
  faultId: string;
  ranked: Suspect[];
  summary: string;
  probes: AgentStep[];
  budget: number;
  verified?: {
    faultId: string;
    label: string;
    expected: string[];
    score: number;
  }[];
}

/** Distance below which a fault signature counts as an exact fit. */
const EXACT_FIT = 1e-6;

/**
 * Merge the model's ranking with the solver's exact-fit faults. Parts named by
 * a fault whose simulated signature reproduces every probe exactly outrank
 * parts the model merely suspects, because the physics already explains the
 * measurements. Model order is preserved inside each group.
 */
export function mergeRanking(ranked: Suspect[], verified: AgentResult["verified"] = []): Suspect[] {
  const exact = (verified ?? []).filter((v) => v.score <= EXACT_FIT);
  const support = new Map<string, string[]>();
  for (const v of exact) {
    for (const ref of v.expected) {
      support.set(ref, [...(support.get(ref) ?? []), v.faultId]);
    }
  }

  const merged: Suspect[] = ranked.map((r) =>
    support.has(r.ref) ? { ...r, solver: support.get(r.ref) } : { ...r, solver: undefined },
  );
  for (const [ref, ids] of support) {
    if (!merged.some((r) => r.ref === ref)) {
      merged.push({
        ref,
        confidence: 0.25,
        reason: `Simulation of ${ids.join(", ")} reproduces every probe exactly.`,
        solver: ids,
      });
    }
  }

  return merged.sort(
    (a, b) => Number(!!b.solver) - Number(!!a.solver) || b.confidence - a.confidence,
  );
}

export type AgentEvent =
  | {
      type: "probe";
      node: string;
      kind: "voltage" | "resistance";
      value: number;
      unit: string;
      open: boolean;
      why: string;
    }
  | { type: "final"; result: AgentResult };

const SCHEMA = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["probe", "diagnose"] },
    kind: { type: "string", enum: ["voltage", "resistance", "none"] },
    node: { type: "string" },
    why: { type: "string" },
    ranked: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ref: { type: "string" },
          confidence: { type: "number" },
          reason: { type: "string" },
        },
        required: ["ref", "confidence", "reason"],
      },
    },
    summary: { type: "string" },
  },
  required: ["action", "kind", "node", "why", "ranked", "summary"],
} as const;

function systemPrompt(
  board: Board,
  symptom: string,
  map: ComponentMap,
  budget: number,
  netlistText?: string,
): string {
  const tps = board.testPoints
    .map((tp) => `${tp.id} ${tp.label} (node ${tp.node})`)
    .join("; ");
  const comps = map.components
    .map((c) => `${c.ref} ${c.type} ${c.value}`.trim())
    .join("; ");
  const traces = board.components
    .filter((c) => c.type === "trace")
    .map((c) => `${c.id} ${c.pins[1]} -> ${c.pins[2]} (${c.params?.resistance ?? 0} ohm)`)
    .join("; ");
  const netlist = board.components
    .filter((c) => c.type !== "testpoint")
    .map(
      (c) =>
        `${c.id} ${c.type} ${Object.entries(c.pins)
          .map(([pin, net]) => `${pin}=${net}`)
          .join(" ")}`,
    )
    .join("; ");
  return [
    "You are BoardBreaker, a PCB diagnostic agent.",
    `Board: ${board.name}. ${board.description}`,
    `Symptom: ${symptom}`,
    `Test points: ${tps}.`,
    `Component map read from the board image: ${comps}.`,
    `Non-visual nets from the board profile: ${traces}.`,
    `Netlist from the board profile: ${netlist}.`,
    netlistText ? `Full netlist from the board design files: ${netlistText}.` : "",
    `You may take at most ${budget} measurements. Each costs one.`,
    "Voltage probes are taken with the board powered. Resistance probes are taken with the board unpowered and measure resistance to ground.",
    "Reason about the power tree: input, protection, regulators, rails, then loads. Prefer upstream measurements before downstream ones. Do not repeat a probe.",
    "Find the first break: walk the power path from the source. The component whose upstream node has the expected voltage and whose downstream node does not is the prime suspect.",
    "Voltage decides where the break is. Resistance only distinguishes an open from a short to ground at that node.",
    "A 0 ohm reading on a regulator output with a correct input is a rail short. The regulator is current-limiting, not failed; suspect a decoupling capacitor or load on that rail before the regulator.",
    "Resistance separates the culprits on a shorted rail: a decoupling capacitor that fails short reads essentially 0 ohm, while a chip that fails short usually reads a few ohm. A capacitor reads open when the rail is merely unpowered.",
    "A signal stuck low can be a stuck switch or an open pull-up. Measure resistance at the signal node: near 0 ohm means the switch is closed, a high value means the pull-up is open.",
    "If the evidence is sufficient, diagnose. If not, probe. Only name refs that exist in the component map or the non-visual nets.",
    "Probe by node name (e.g. 5V) or by test point id (e.g. TP4).",
    "Return JSON only.",
  ].join("\n");
}

function transcript(steps: AgentStep[]): string {
  if (!steps.length) return "No measurements taken yet.";
  return steps
    .map((s, i) =>
      s.unit === "OL"
        ? `${i + 1}. ${s.probe} = OL (no DC path)`
        : `${i + 1}. ${s.probe} = ${s.value} ${s.unit}`,
    )
    .join("\n");
}

export async function diagnoseCase(
  board: Board,
  fault: Fault,
  map: ComponentMap,
  budget = 6,
  onEvent?: (event: AgentEvent) => void,
  opts: { faults?: Fault[]; netlistText?: string } = {},
): Promise<AgentResult> {
  const faulty = applyFault(board, fault);
  const steps: AgentStep[] = [];
  const base = systemPrompt(board, fault.symptom, map, budget, opts.netlistText);
  const nodeOf = new Map<string, string>();
  for (const tp of board.testPoints) {
    nodeOf.set(tp.id, tp.node);
    nodeOf.set(tp.node, tp.node);
  }

  for (let turn = 0; turn <= budget; turn++) {
    const forced = turn === budget;
    const prompt = [
      base,
      "",
      "Measurements so far:",
      transcript(steps),
      "",
      forced
        ? "You have used your probe budget. Return action=diagnose now."
        : `Turn ${turn + 1} of ${budget}. Choose action=probe or action=diagnose.`,
    ].join("\n");

    const res = await metaJson<any>("/responses", {
      model: "muse-spark-1.3",
      reasoning: { effort: "low" },
      input: [{ type: "message", role: "user", content: [{ type: "input_text", text: prompt }] }],
      text: { format: { type: "json_schema", name: "Diagnosis", schema: SCHEMA } },
    });
    const out = JSON.parse(extractText(res));

    if (out.action === "probe" && !forced) {
      const kind = out.kind === "resistance" ? "resistance" : "voltage";
      const requested = String(out.node ?? "").trim();
      const node = nodeOf.get(requested) ?? "";
      if (!node) {
        steps.push({ probe: `invalid probe ${requested}`, value: 0, unit: "V" });
        continue;
      }
      const reading: Reading =
        kind === "resistance"
          ? measureResistance(board, faulty, node)
          : measureVoltage(board, faulty, node);
      const step: AgentStep = {
        probe: `${kind} ${node}`,
        value: reading.open ? 0 : reading.value,
        unit: reading.open ? "OL" : reading.unit,
        why: out.why,
        kind,
        node,
        open: reading.open ?? false,
      };
      steps.push(step);
      onEvent?.({
        type: "probe",
        node,
        kind,
        value: step.value,
        unit: step.unit,
        open: reading.open ?? false,
        why: out.why ?? "",
      });
      continue;
    }

    const usable = steps.filter((s) => s.kind && s.node);
    const candidates = diagnoseBySimulation(
      board,
      usable.map((s) => ({ kind: s.kind!, node: s.node! })),
      usable.map((s) => (s.open ? 1e9 : s.value)),
      opts.faults,
    );
    // Several faults can fit the same partial evidence. When the solver has a
    // tie, let the model's ranking break it; otherwise take the best fit.
    const best = candidates[0]?.score ?? 0;
    const tied = candidates.filter((c) => c.score <= best + 1e-6);
    const modelRefs = new Set((out.ranked ?? []).map((r: { ref: string }) => r.ref));
    const chosen =
      tied.find((c) => c.fault.expectedSuspects.some((ref) => modelRefs.has(ref))) ??
      candidates[0];
    const ordered = chosen
      ? [chosen, ...candidates.filter((c) => c !== chosen)]
      : candidates;
    const verified = ordered.slice(0, 3).map((c) => ({
      faultId: c.fault.id,
      label: c.fault.label,
      expected: c.fault.expectedSuspects,
      score: c.score,
    }));

    const result: AgentResult = {
      faultId: fault.id,
      ranked: mergeRanking(out.ranked ?? [], verified),
      summary: out.summary ?? "",
      probes: steps,
      budget,
      verified,
    };
    onEvent?.({ type: "final", result });
    return result;
  }

  return { faultId: fault.id, ranked: [], summary: "no diagnosis", probes: steps, budget };
}
