import { readFileSync } from "node:fs";
import { parseKicadNetlist, refClass } from "../src/netlist/kicad.js";

const path = process.argv[2];
if (!path) throw new Error("usage: tsx scripts/netlist-report.ts <file.net>");
const netlist = parseKicadNetlist(readFileSync(path, "utf8"));

console.log(`title   ${netlist.title} rev ${netlist.rev}`);
console.log(`tool    ${netlist.tool}`);
console.log(`parts   ${netlist.components.length}`);
console.log(`nets    ${netlist.nets.length}`);

const classes = new Map<string, number>();
for (const c of netlist.components) classes.set(refClass(c.ref), (classes.get(refClass(c.ref)) ?? 0) + 1);
console.log("classes " + [...classes].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(" "));

const unconnected = netlist.components.filter((c) => Object.keys(c.pins).length === 0);
if (unconnected.length) console.log("no pins " + unconnected.map((c) => c.ref).join(" "));

console.log("\n-- multi-pin parts --");
for (const c of netlist.components) {
  const pins = Object.keys(c.pins);
  if (pins.length < 3) continue;
  console.log(`${c.ref.padEnd(12)} ${c.value.slice(0, 34).padEnd(34)} pins=${pins.length} ${pins.slice(0, 6).join(",")}`);
}

console.log("\n-- power nets --");
const interesting = netlist.nets.filter((n) => /3V3|5V|VBAT|GND|VIN|USB|BAT/i.test(n.name));
for (const net of interesting) {
  console.log(`${net.name} (${net.nodes.length}) ` + net.nodes.slice(0, 10).map((x) => `${x.ref}.${x.pin}`).join(" "));
}
