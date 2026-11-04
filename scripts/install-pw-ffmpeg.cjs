const fs = require("fs");
const path = require("path");
const src = require("ffmpeg-static");
const dir = path.join(process.env.LOCALAPPDATA, "ms-playwright", "ffmpeg-1013");
fs.mkdirSync(dir, { recursive: true });
const dest = path.join(dir, "ffmpeg-win64.exe");
fs.copyFileSync(src, dest);
console.log("copied", src, "->", dest);
