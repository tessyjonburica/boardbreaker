const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
const keep = ["tsx", "typescript", "vitest", "zod"];
const dev = {};
for (const k of keep) if (p.devDependencies[k]) dev[k] = p.devDependencies[k];
Object.assign(dev, {
  vite: "^7.1.0",
  "@vitejs/plugin-react": "^5.0.0",
  "@types/react": "^19.1.0",
  "@types/react-dom": "^19.1.0",
  express: "^5.1.0",
  "@types/express": "^5.0.0",
});
p.devDependencies = dev;
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
console.log(Object.keys(dev));
