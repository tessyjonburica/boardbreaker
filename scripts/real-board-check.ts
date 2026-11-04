import { loadEsp32Lipo, ESP32_LIPO_FAULTS } from "../src/boards/olimex-esp32-devkit-lipo.js";
import { applyFault } from "../src/bench/faults.js";
import { solveBoard } from "../src/bench/solver.js";

const { board } = loadEsp32Lipo();
console.log(`${board.name}: ${board.components.length} parts in the DC model, ${board.testPoints.length} probes`);

const healthy = solveBoard(board, board.components, { powered: true });
console.log(`converged=${healthy.converged} in ${healthy.iterations} iterations\n`);

const fmt = (v: number) => (Math.abs(v) < 1e-3 ? "0.000" : v.toFixed(3));
const header = ["case".padEnd(6), ...board.testPoints.map((t) => t.id.padStart(7))].join(" ");
console.log(header + "   suspect");
console.log(["-".repeat(6), ...board.testPoints.map(() => "-".repeat(7))].join(" "));

const show = (id: string, comps: typeof board.components, tag: string) => {
  const r = solveBoard(board, comps, { powered: true });
  const cells = board.testPoints.map((t) => fmt(r.voltages[t.node] ?? 0).padStart(7));
  console.log([id.padEnd(6), ...cells].join(" ") + "   " + tag);
};

show("ok", board.components, "-");
for (const fault of ESP32_LIPO_FAULTS) {
  const comps = applyFault(board, fault);
  show(fault.id, comps, fault.expectedSuspects.join("/"));
}

console.log("\nprobe nets: " + board.testPoints.map((t) => `${t.id}=${t.node}`).join(" "));
