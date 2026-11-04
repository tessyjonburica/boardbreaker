const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.dependencies = {
  ...p.dependencies,
  "@fontsource/space-grotesk": "^5.2.5",
  "@fontsource/ibm-plex-mono": "^5.2.5",
};
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
console.log("ok");
