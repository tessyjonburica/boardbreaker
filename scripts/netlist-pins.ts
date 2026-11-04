import { readFileSync } from "node:fs";
import { parseKicadNetlist } from "../src/netlist/kicad.js";

const path = process.argv[2];
const refs = process.argv.slice(3);
const netlist = parseKicadNetlist(readFileSync(path, "utf8"));
const want = refs.length ? new Set(refs) : null;
for (const c of netlist.components) {
  if (want && !want.has(c.ref)) continue;
  const pins = Object.entries(c.pins).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  console.log(`${c.ref} [${c.value}]`);
  for (const [pin, net] of pins) console.log(`   ${pin} -> ${net}`);
}
