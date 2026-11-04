const fs = require("fs");
const extra = [
  "",
  ".solver {",
  "  display: flex;",
  "  align-items: baseline;",
  "  flex-wrap: wrap;",
  "  gap: 6px;",
  "  margin: 10px 0 0;",
  "  font-family: var(--mono);",
  "  font-size: 10px;",
  "  color: var(--dim);",
  "}",
  ".solver b { color: var(--probe); font-weight: 500; }",
  ".solver span { margin-left: auto; color: var(--faint); }",
  "",
].join("\n");
fs.appendFileSync("web/src/side.css", extra);
console.log("ok");
