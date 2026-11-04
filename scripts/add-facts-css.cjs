const fs = require("fs");
const extra = [
  "",
  ".facts {",
  "  display: grid;",
  "  grid-template-columns: 1fr 1fr;",
  "  gap: 1px;",
  "  margin: 0 0 18px;",
  "  background: var(--line);",
  "  border: 1px solid var(--line);",
  "}",
  ".facts div { background: var(--panel); padding: 8px 10px; }",
  ".facts dt {",
  "  font-family: var(--mono);",
  "  font-size: 9px;",
  "  letter-spacing: 0.1em;",
  "  text-transform: uppercase;",
  "  color: var(--faint);",
  "}",
  ".facts dd {",
  "  margin: 3px 0 0;",
  "  font-family: var(--mono);",
  "  font-size: 15px;",
  "  color: var(--text);",
  "}",
  "",
].join("\n");
fs.appendFileSync("web/src/side.css", extra);
console.log("ok");
