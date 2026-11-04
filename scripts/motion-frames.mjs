import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import ffmpegStatic from "ffmpeg-static";

const ff = ffmpegStatic;
const src = "docs/boardbreaker-motion.mp4";
mkdirSync("out/motion", { recursive: true });

for (const t of [1, 9, 17, 25, 33, 41, 49, 53]) {
  spawnSync(ff, ["-y", "-ss", String(t), "-i", src, "-frames:v", "1", "-vf", "scale=1280:-1", `out/motion/f${t}.png`], { stdio: "ignore" });
}

const r = spawnSync(ff, ["-hide_banner", "-i", src, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
const err = r.stderr || "";
const lines = err.split(/\r?\n/).filter((l) => /mean_volume|max_volume|Duration/.test(l));
console.log(lines.join("\n"));
