const fs = require("fs");
const extra = [
  "",
  ".side { overflow: hidden; }",
  "",
  "@media (max-width: 980px) {",
  "  .app { height: auto; overflow: visible; }",
  "  .main { overflow: visible; }",
  "  .board-frame { max-height: none; }",
  "}",
  "",
].join("\n");
fs.appendFileSync("web/src/side.css", extra);
console.log("appended");
