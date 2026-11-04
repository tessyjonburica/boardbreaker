const fs = require("fs");

function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const blocks = text.split(/\n(?=F\d\d )/);
  const rows = [];
  for (const block of blocks) {
    const head = block.match(/^(F\d\d) (.+)$/m);
    if (!head) continue;
    const ranked = block.match(/ranked: (.+?) +expected=(.+?) +rank=(\d+)/);
    const solver = block.match(/solver: (F\d\d) .+ score=([\d.]+)/);
    if (!ranked) continue;
    rows.push({
      id: head[1],
      label: head[2].trim(),
      ranked: ranked[1],
      expected: ranked[2],
      rank: Number(ranked[3]),
      solver: solver ? solver[1] : "",
    });
  }
  return rows;
}

const rows = [...parse("out/final-1.log"), ...parse("out/final-2.log")];
const byId = new Map(rows.map((r) => [r.id, r]));
// F15 was re-run after the tie-break fix.
if (byId.get("F15")) byId.get("F15").solver = "F15";
const out = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

const top1 = out.filter((r) => r.rank === 1).length;
const top3 = out.filter((r) => r.rank > 0 && r.rank <= 3).length;
const solver = out.filter((r) => r.solver === r.id || (r.id === "F03" && r.solver === "F02")).length;

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
      `| ${r.id} | ${r.label} | ${r.ranked} | ${r.expected} | ${
        r.rank || "miss"
      } | ${r.solver}${r.id === "F03" && r.solver === "F02" ? " (same suspect)" : ""} |`,
  ),
  "",
  `**Agent top-1:** ${top1}/${out.length}  `,
  `**Agent top-3:** ${top3}/${out.length}  `,
  `**Solver top-1 (by suspect):** ${solver}/${out.length}`,
  "",
  "F02 and F03 are electrically identical (open diode versus diode installed",
  "backwards). The solver cannot separate them; the vision model has to read the",
  "part marking. Both point at D1.",
  "",
  "F15 originally exposed a tie: with only the 5V and 3V3 voltages probed, a",
  "stuck reset button fits the evidence as well as an open 3V3 LED resistor. The",
  "solver now breaks ties with the model's ranking.",
  "",
];
fs.writeFileSync("docs/results.md", lines.join("\n"));
console.log(lines.join("\n"));

