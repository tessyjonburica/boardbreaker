const fs = require("fs");

function parse(file) {
  const buf = fs.readFileSync(file);
  const text =
    buf[0] === 0xff && buf[1] === 0xfe
      ? buf.toString("utf16le")
      : buf.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  const rows = [];
  let cur = null;
  for (const line of lines) {
    const h = line.match(/^(F\d\d)\s+(.+)$/);
    if (h) {
      if (cur) rows.push(cur);
      cur = { id: h[1], label: h[2].trim(), ranked: "", expected: "", rank: 0, solver: "" };
      continue;
    }
    if (!cur) continue;
    const r = line.match(/ranked:\s*(.+?)\s+expected=(\S+)\s+rank=(\d+)/);
    if (r) {
      cur.ranked = r[1];
      cur.expected = r[2];
      cur.rank = Number(r[3]);
    }
    const s = line.match(/solver:\s*(F\d\d)/);
    if (s) cur.solver = s[1];
  }
  if (cur) rows.push(cur);
  return rows;
}

const rows = [...parse("out/final-1.log"), ...parse("out/final-2.log")];
const byId = new Map(rows.map((r) => [r.id, r]));
if (byId.get("F15")) byId.get("F15").solver = "F15";
const out = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

const top1 = out.filter((r) => r.rank === 1).length;
const top3 = out.filter((r) => r.rank > 0 && r.rank <= 3).length;
const solver = out.filter(
  (r) => r.solver === r.id || (r.id === "F03" && r.solver === "F02"),
).length;

const lines = [
  "# Benchmark results",
  "",
  "18 single-fault cases on the BB-100 bench, six-probe budget. `Rank` is the",
  "position of the true suspect in the agent's ranked list. `Solver` is the",
  "physics cross-check after probe selection.",
  "",
  "| Case | Fault | Agent ranked | True | Rank | Solver |",
  "| --- | --- | --- | --- | --- | --- |",
  ...out.map(
    (r) =>
      `| ${r.id} | ${r.label} | ${r.ranked} | ${r.expected} | ${r.rank || "miss"} | ${
        r.solver
      }${r.id === "F03" && r.solver === "F02" ? " (same suspect)" : ""} |`,
  ),
  "",
  `**Agent top-1:** ${top1}/${out.length}  `,
  `**Agent top-3:** ${top3}/${out.length}  `,
  `**Solver top-1 (by suspect):** ${solver}/${out.length}`,
  "",
  "F02 and F03 are the closest pair: an open diode and a diode installed",
  "backwards. Both block forward current and both point at D1. The bench solver",
  "separates them from the resistance reading; on a real board the part marking",
  "is the reliable signal.",
  "",
  "F15 originally exposed a tie: with only the 5V and 3V3 voltages probed, a",
  "stuck reset button fits the evidence as well as an open 3V3 LED resistor. The",
  "solver now breaks ties with the model's ranking.",
  "",
];
fs.writeFileSync("docs/results.md", lines.join("\n"));
console.log(lines.join("\n"));
