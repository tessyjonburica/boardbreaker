import { BB100 } from "../bench/board.js";
import { applyFault, FAULTS } from "../bench/faults.js";
import { FULL_SWEEP, diagnoseBySimulation, signature } from "./baseline.js";

const healthy = BB100.components;
let top1 = 0;
let top3 = 0;
let total = 0;

console.log(`Bench: ${BB100.name}`);
console.log(`Faults: ${FAULTS.length}`);
console.log("");

for (const fault of FAULTS) {
  const faulty = applyFault(BB100, fault);
  const observed = signature(BB100, faulty, FULL_SWEEP);
  const ranked = diagnoseBySimulation(BB100, FULL_SWEEP, observed);
  const rank = ranked.findIndex((c) => c.fault.id === fault.id) + 1;
  total++;
  if (rank === 1) top1++;
  if (rank > 0 && rank <= 3) top3++;
  const guesses = ranked
    .slice(0, 3)
    .map((c) => `${c.fault.id}:${c.score.toFixed(3)}`)
    .join("  ");
  console.log(
    `${fault.id} ${fault.label.padEnd(42)} rank=${rank}  top3=[${guesses}]`,
  );
}

console.log("");
console.log(`Top-1: ${top1}/${total} (${((top1 / total) * 100).toFixed(0)}%)`);
console.log(`Top-3: ${top3}/${total} (${((top3 / total) * 100).toFixed(0)}%)`);
