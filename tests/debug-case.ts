import { BB100 } from "../src/bench/board.js";
import { FAULTS, applyFault } from "../src/bench/faults.js";
import { measureResistance, allVoltages } from "../src/bench/readings.js";
import { solveBoard } from "../src/bench/solver.js";

const f = FAULTS.find((x) => x.id === process.argv[2])!;
const b = applyFault(BB100, f);
console.log("fault", f.id, f.label);
console.log("voltages", allVoltages(BB100, b));
for (const tp of BB100.testPoints) {
  const r = measureResistance(BB100, b, tp.node);
  const s = solveBoard(BB100, b, {
    powered: false,
    probeNode: tp.node,
    probeVoltage: 1,
    probeSeries: 1000,
  });
  console.log(tp.id, tp.node, "R=", r.value, "conv=", s.converged, "Vtest=", s.voltages[tp.node]);
}
