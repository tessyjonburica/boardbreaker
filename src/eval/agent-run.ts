import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { BB100 } from "../bench/board.js";
import { FAULTS } from "../bench/faults.js";
import { diagnoseCase } from "../agent/diagnose.js";
import { drawBoxes, segmentImage } from "../vision/sam.js";
import { mapComponents } from "../vision/map.js";
import type { ComponentMap } from "../vision/map.js";

const image = resolve("out/bb100.png");
const overlay = resolve("out/bb100-labels.png");
const cachePath = resolve("out/component-map.json");

async function getMap(): Promise<ComponentMap> {
  if (existsSync(cachePath)) return JSON.parse(readFileSync(cachePath, "utf8"));
  const meta = await sharp(image).metadata();
  const seg = await segmentImage(image, "electronic component");
  await drawBoxes(image, seg.boxes, overlay, meta.width ?? 1300, meta.height ?? 960);
  const map = await mapComponents(overlay, seg.boxes);
  writeFileSync(cachePath, JSON.stringify(map, null, 2));
  return map;
}

const ids = process.argv.slice(2);
const cases = ids.length ? FAULTS.filter((f) => ids.includes(f.id)) : FAULTS;
const map = await getMap();

let top1 = 0;
let top3 = 0;
let verifiedTop1 = 0;

for (const fault of cases) {
  const result = await diagnoseCase(BB100, fault, map, 6);
  const refs = result.ranked.map((r) => r.ref);
  const rank = refs.findIndex((r) => fault.expectedSuspects.includes(r)) + 1;
  if (rank === 1) top1++;
  if (rank > 0 && rank <= 3) top3++;
  const verified = result.verified?.[0];
  const verifiedHit =
    verified?.expected.some((ref) => fault.expectedSuspects.includes(ref)) ?? false;
  if (verifiedHit) verifiedTop1++;

  console.log(`\n${fault.id} ${fault.label}`);
  console.log(
    `  probes: ${result.probes
      .map((p) => (p.unit === "OL" ? `${p.probe}=OL` : `${p.probe}=${p.value}${p.unit}`))
      .join(", ")}`,
  );
  console.log(`  ranked: ${refs.slice(0, 3).join(" > ")}  expected=${fault.expectedSuspects.join("/")}  rank=${rank}`);
  if (verified) {
    console.log(`  solver: ${verified.faultId} ${verified.label} score=${verified.score.toFixed(3)}`);
  }
  console.log(`  summary: ${result.summary.slice(0, 220)}`);
}

console.log(`\nTop-1 ${top1}/${cases.length}   Top-3 ${top3}/${cases.length}   Solver ${verifiedTop1}/${cases.length}`);
