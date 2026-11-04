import { resolve } from "node:path";
import sharp from "sharp";
import { BB100 } from "../bench/board.js";
import { drawBoxes, segmentImage } from "./sam.js";
import { mapComponents } from "./map.js";

const image = resolve("out/bb100.png");
const meta = await sharp(image).metadata();
const seg = await segmentImage(image, "electronic component");
const overlay = resolve("out/sam-electronic-component.png");
await drawBoxes(image, seg.boxes, overlay, meta.width ?? 1300, meta.height ?? 960);

const map = await mapComponents(overlay, seg.boxes);
console.log(JSON.stringify(map, null, 2));

const known = new Set(BB100.components.map((c) => c.ref));
const hits = map.components.filter((c) => known.has(c.ref)).length;
console.log(`\nboxes=${seg.boxes.length} mapped=${map.components.length} validRefs=${hits}`);
