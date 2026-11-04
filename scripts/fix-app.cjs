const fs = require("fs");
const path = "web/src/App.tsx";
let s = fs.readFileSync(path, "utf8");
const pairs = [
  ["\u00ce\u00a9", "\u03a9"],
  ["\u00c2\u00b7", "\u00b7"],
  ["\u00e2\u20ac\u00a6", "\u2026"],
  ["\u00e2\u20ac\u201d", "\u2014"],
];
for (const [from, to] of pairs) s = s.split(from).join(to);
fs.writeFileSync(path, s);
console.log("remaining mangled:", (s.match(/[\u00c2\u00ce\u00e2]/g) || []).length);
