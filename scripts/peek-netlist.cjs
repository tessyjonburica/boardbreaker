const fs = require("fs");
const p = "C:/Users/USER/Desktop/realboards/ESP32-DevKit-LiPo/HARDWARE/ESP32-DevKit-LiPo-Rev.C/ESP32-DevKit-Lipo_Rev_C.net";
const t = fs.readFileSync(p, "utf8");
const comps = [...t.matchAll(/\(comp \(ref ([^)]+)\)\s*\(value ([^)]*)\)/g)].map((m) => m[1] + " = " + m[2]);
console.log("comps " + comps.length);
console.log(comps.join("\n"));
const nets = [...t.matchAll(/\(net \(code "?[\d]+"?\) \(name ([^)]*)\)/g)].map((m) => m[1]);
console.log("nets " + nets.length);
console.log(nets.join(" | "));
