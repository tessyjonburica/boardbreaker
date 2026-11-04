const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.scripts = {
  ...p.scripts,
  dev: "tsx watch server/index.ts",
  "dev:web": "vite",
  "build:web": "vite build",
  start: "tsx server/index.ts",
  eval: "tsx src/eval/run.ts",
  agent: "tsx src/eval/agent-run.ts",
};
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
console.log(p.scripts);
