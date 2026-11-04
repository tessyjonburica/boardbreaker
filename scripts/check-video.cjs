const { spawnSync } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const r = spawnSync(ffmpeg, ["-y", "-ss", "2", "-i", "out/video/boardbreaker-demo.mp4", "-frames:v", "1", "out/video/check-start.png"]);
const r2 = spawnSync(ffmpeg, ["-y", "-ss", "33", "-i", "out/video/boardbreaker-demo.mp4", "-frames:v", "1", "out/video/check-end.png"]);
console.log(r.status, r2.status);
