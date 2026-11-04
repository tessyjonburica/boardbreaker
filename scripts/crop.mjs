import sharp from "sharp";
import { join } from "node:path";

const src = join("out", "shots", "3-result.png");
const out = join("out", "shots", "crop-suspect.png");
await sharp(src)
  .extract({ left: 915, top: 640, width: 520, height: 170 })
  .resize({ width: 1560, kernel: "nearest" })
  .toFile(out);
console.log("wrote", out);
