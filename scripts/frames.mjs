import { spawnSync } from "node:child_process";
import path from "node:path";

const ff = path.resolve("node_modules/ffmpeg-static/ffmpeg.exe");
const src = path.resolve("out/video/boardbreaker-demo.mp4");
const times = [4, 20, 34, 46, 68, 86, 93];
for (const t of times) {
  const out = path.resolve(`out/video/frame-${t}s.png`);
  const r = spawnSync(ff, ["-y", "-ss", String(t), "-i", src, "-frames:v", "1", out], { encoding: "utf8" });
  console.log(t, r.status, out);
}
