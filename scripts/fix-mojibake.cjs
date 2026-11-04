const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "web", "src", "App.tsx");
let s = fs.readFileSync(file, "utf8");
const rep = [
  ["\u00c2\u00b7", "\u00b7"],
  ["\u00e2\u20ac\u00a6", "\u2026"],
  ["\u00e2\u20ac\u201d", "\u2014"],
];
let count = 0;
for (const [from, to] of rep) {
  const parts = s.split(from);
  count += parts.length - 1;
  s = parts.join(to);
}
fs.writeFileSync(file, s, "utf8");
console.log("replaced", count);
