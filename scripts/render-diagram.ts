import { writeFileSync } from "node:fs";
import { renderDiagramPng, diagramSvg } from "../src/boards/esp32-diagram.js";

writeFileSync("out/esp32-diagram.svg", diagramSvg());
const png = await renderDiagramPng(1.5);
writeFileSync("out/esp32-diagram.png", png);
console.log("wrote", png.length, "bytes");
