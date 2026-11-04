const fs = require("fs");
const t = fs.readFileSync("out/final-1.log", "utf8");
console.log(JSON.stringify(t.slice(0, 400)));
console.log("lines", t.split(/\r?\n/).length);
const lines = t.split(/\r?\n/).filter((l) => l.includes("F01")).slice(0, 3);
for (const l of lines) console.log(JSON.stringify(l));
