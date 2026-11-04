const { spawnSync } = require("child_process");
const ffmpeg = require("ffmpeg-static");

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) {
  console.error("usage: node scripts/to-mp4.cjs <in.webm> <out.mp4>");
  process.exit(1);
}

const r = spawnSync(
  ffmpeg,
  ["-y", "-i", input, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", output],
  { stdio: "inherit" },
);
process.exit(r.status ?? 1);
