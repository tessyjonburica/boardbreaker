import { resolve } from "node:path";
import sharp from "sharp";
import { drawBoxes, segmentImage } from "./sam.js";

const prompt = process.argv[2] ?? "integrated circuit";
const image = resolve("out/bb100.png");
const meta = await sharp(image).metadata();

const result = await segmentImage(image, prompt);
console.log(`prompt: ${prompt}`);
console.log(`boxes: ${result.boxes.length}`);
for (const b of result.boxes) {
  console.log(
    `  #${b.id} box=(${b.x1},${b.y1})-(${b.x2},${b.y2}) conf=${b.confidence ?? "-"}`,
  );
}
if (!result.boxes.length) console.log("raw:", result.raw.slice(0, 500));

const out = resolve(`out/sam-${prompt.replace(/\s+/g, "-")}.png`);
await drawBoxes(image, result.boxes, out, meta.width ?? 1300, meta.height ?? 960);
console.log(out);
