import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderBoardPng } from "./render.js";

mkdirSync(resolve("out"), { recursive: true });
const png = await renderBoardPng();
const path = resolve("out/bb100.png");
writeFileSync(path, png);
console.log(path);
console.log(`${png.length} bytes`);
