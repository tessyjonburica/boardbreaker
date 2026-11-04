const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.devDependencies = {
  ...p.devDependencies,
  "playwright-core": "^1.55.0",
  "ffmpeg-static": "^5.2.0",
};
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
console.log("ok");
