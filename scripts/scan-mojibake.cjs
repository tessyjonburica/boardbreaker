const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "web", "src");
const bad = /[\u00c2\u00c3\u00e2\u00ee\u00f0\ufffd]/;
for (const f of fs.readdirSync(dir)) {
  if (!/\.(tsx?|css)$/.test(f)) continue;
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  const lines = s.split(/\r?\n/);
  lines.forEach((l, i) => {
    if (bad.test(l)) {
      console.log(f + ":" + (i + 1) + " " + JSON.stringify(l.trim()).slice(0, 180));
    }
  });
}
