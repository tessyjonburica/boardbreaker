import { appendFileSync } from "node:fs";
import { ESP32_LIPO_FAULTS, loadEsp32Lipo } from "../boards/olimex-esp32-devkit-lipo.js";
import { diagnoseCase } from "../agent/diagnose.js";
import { applyFault } from "../bench/faults.js";
import { diagnoseBySimulation } from "../eval/baseline.js";
import { measureVoltage } from "../bench/readings.js";
import { mapFromNetlist, netlistToText } from "../netlist/prompt.js";

const { board, netlist } = loadEsp32Lipo();
const map = mapFromNetlist(netlist);
const netlistText = netlistToText(netlist);

const ids = process.argv.slice(2);
const cases = ids.length ? ESP32_LIPO_FAULTS.filter((f) => ids.includes(f.id)) : ESP32_LIPO_FAULTS;

const logPath = process.env.LOG ?? "out/real-1.log";
const lines: string[] = [];
const say = (s: string) => {
  console.log(s);
  lines.push(s);
};

say(`board ${board.name} (${netlist.components.length} parts, ${netlist.nets.length} nets, real KiCad netlist)`);
say(`model ${board.components.length} parts in the DC model, ${board.testPoints.length} probes, budget 6`);

let top1 = 0;
let top3 = 0;
let solver1 = 0;

for (const fault of cases) {
  const result = await diagnoseCase(board, fault, map, 6, undefined, {
    faults: ESP32_LIPO_FAULTS,
    netlistText,
  });
  const refs = result.ranked.map((r) => r.ref);
  const rank = refs.findIndex((r) => fault.expectedSuspects.includes(r)) + 1;
  if (rank === 1) top1++;
  if (rank > 0 && rank <= 3) top3++;
  const verified = result.verified?.[0];
  const hit = verified?.expected.some((ref) => fault.expectedSuspects.includes(ref)) ?? false;
  if (hit) solver1++;

  say(`\n${fault.id} ${fault.label}${fault.symptomOnly ? "  [symptom only]" : ""}`);
  say(
    `  probes: ${result.probes
      .map((p) => (p.unit === "OL" ? `${p.probe}=OL` : `${p.probe}=${p.value}${p.unit}`))
      .join(", ")}`,
  );
  say(`  ranked: ${refs.slice(0, 3).join(" > ")}  expected=${fault.expectedSuspects.join("/")}  rank=${rank}`);
  if (verified) say(`  solver: ${verified.faultId} ${verified.label} score=${verified.score.toFixed(3)}`);
  say(`  summary: ${result.summary.slice(0, 240)}`);
}

// Full-sweep baseline on the same board: every probe, no budget.
let sweep1 = 0;
for (const fault of cases) {
  const faulty = applyFault(board, fault);
  const readings = board.testPoints.map((tp) => measureVoltage(board, faulty, tp.node));
  const candidates = diagnoseBySimulation(
    board,
    board.testPoints.map((tp) => ({ kind: "voltage" as const, node: tp.node })),
    readings.map((r) => (r.open ? 1e9 : r.value)),
    ESP32_LIPO_FAULTS,
  );
  const best = candidates[0];
  if (best?.fault.expectedSuspects.some((ref) => fault.expectedSuspects.includes(ref))) sweep1++;
}

say(`\nTop-1 ${top1}/${cases.length}   Top-3 ${top3}/${cases.length}   Solver ${solver1}/${cases.length}   Full sweep ${sweep1}/${cases.length}`);
appendFileSync(logPath, lines.join("\n") + "\n", "utf8");
