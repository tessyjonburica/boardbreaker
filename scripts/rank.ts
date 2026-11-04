// Print the agent's merged ranking for one fault, straight from the library.
// Usage: node --import tsx scripts/rank.ts F10
import { diagnoseCase } from "../src/agent/diagnose.js";
import { BB100 } from "../src/bench/board.js";
import { FAULTS } from "../src/bench/faults.js";
import map from "../out/component-map.json" with { type: "json" };

const id = (process.argv[2] || "F10").toUpperCase();
const fault = FAULTS.find((f) => f.id === id);
if (!fault) throw new Error(`unknown fault ${id}`);

const result = await diagnoseCase(BB100, fault, map as never, 6);
console.log("truth:", fault.expectedSuspects.join(" / "));
for (const [i, s] of result.ranked.entries()) {
  console.log(`${i + 1}. ${s.ref} ${(s.confidence * 100).toFixed(0)}%${s.solver ? ` [solver ${s.solver.join(",")}]` : ""}`);
}
console.log("verified:", (result.verified ?? []).map((v) => `${v.faultId}:${v.score.toFixed(3)}`).join(" "));
console.log("top-1 hit:", fault.expectedSuspects.includes(result.ranked[0]?.ref ?? ""));
