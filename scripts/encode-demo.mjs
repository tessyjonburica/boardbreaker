import { spawnSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";

const dir = path.resolve("out/video");
const ff = path.resolve("node_modules/ffmpeg-static/ffmpeg.exe");
if (!existsSync(ff)) throw new Error("ffmpeg missing: " + ff);

const webm = readdirSync(dir).filter((f) => f.endsWith(".webm")).sort().pop();
if (!webm) throw new Error("no webm in " + dir);
const src = path.join(dir, webm);
const out = path.join(dir, "boardbreaker-demo.mp4");
console.log("src", src);

const args = ["-y", "-i", src, "-vf", "fps=30", "-c:v", "libx264", "-preset", "slow",
  "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out];
const r = spawnSync(ff, args, { encoding: "utf8", maxBuffer: 1 << 26 });
const tail = (r.stderr || "").trim().split("\n").slice(-3).join("\n");
console.log(tail);
console.log("exit", r.status);
