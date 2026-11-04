const { spawnSync } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const [input, output, time] = process.argv.slice(2);
const r = spawnSync(ffmpeg, ["-y", "-ss", time, "-i", input, "-frames:v", "1", output], {
  stdio: "inherit",
});
process.exit(r.status ?? 1);
