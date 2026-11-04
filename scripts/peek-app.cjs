const fs = require("fs");
const lines = fs.readFileSync("web/src/App.tsx", "utf8").split("\n");
for (const n of [44, 45, 46, 260, 270, 280, 324, 378, 419, 435]) {
  console.log(n, JSON.stringify(lines[n - 1]));
}
