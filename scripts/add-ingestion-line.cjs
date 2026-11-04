const fs = require("node:fs");
const path = require("node:path");
const p = path.join("docs", "demo-brief.md");
let s = fs.readFileSync(p, "utf8");
const anchor = "- **Honest limitation:**";
const add =
  "- **Real-board ingestion:** the ingestion path was checked against a real\n" +
  "  open-hardware design, the Olimex ESP32-DevKit-LiPo Rev C KiCad netlist (54\n" +
  "  parts, 72 nets, Apache-2.0). The parser resolves it; that is not the same as\n" +
  "  a validated diagnosis of that board, and the results above are all BB-100.\n";
if (!s.includes("Real-board ingestion")) {
  s = s.replace(anchor, add + anchor);
  fs.writeFileSync(p, s, "utf8");
  console.log("added");
}
const tail = fs.readFileSync(p, "utf8");
console.log(tail.slice(tail.indexOf("- **Results:**")).trim());
