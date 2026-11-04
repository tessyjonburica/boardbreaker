import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import ffmpegStatic from "ffmpeg-static";

const src = "docs/boardbreaker-motion.mp4";
mkdirSync("out/motion", { recursive: true });
for (const t of [5, 13, 21, 29, 37, 45, 51]) {
  spawnSync(ffmpegStatic, ["-y", "-ss", String(t), "-i", src, "-frames:v", "1", "-vf", "scale=960:-1", `out/motion/t${t}.png`], { stdio: "ignore" });
}
console.log("done");
