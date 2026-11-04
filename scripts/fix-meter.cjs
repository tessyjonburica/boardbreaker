const fs = require("node:fs");
const path = require("node:path");

const file = path.join("web", "src", "side.css");
let css = fs.readFileSync(file, "utf8");

const start = css.indexOf("/* ---------- live meter reading");
const endMarker = ".meter-node {";
const end = css.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("markers not found");
const close = css.indexOf("}", css.indexOf("color: var(--dim);", end)) + 1;

const replacement = `/* ---------- live meter reading, docked in the panel head ---------- */

.meter-inline {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
  min-width: 0;
  animation: meter-in 220ms ease-out;
}

@keyframes meter-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

.meter-label {
  font-family: var(--mono);
  font-size: 8.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--faint);
  white-space: nowrap;
}

.meter-inline strong {
  font-family: var(--mono);
  font-size: 19px;
  font-weight: 400;
  line-height: 1;
  color: var(--probe);
  font-variant-numeric: tabular-nums;
}

.meter-inline strong.open {
  color: var(--bad);
}

.meter-node {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}`;

css = css.slice(0, start) + replacement + css.slice(close);
fs.writeFileSync(file, css);

// responsive block still targets .meter
console.log(css.split("\n").filter((l) => l.includes(".meter")).join("\n"));

