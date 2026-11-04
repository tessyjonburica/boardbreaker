const cp = require("child_process");
const ff = require("ffmpeg-static");
const file = process.argv[2] || "out/video/boardbreaker-demo.mp4";
const r = cp.spawnSync(ff, ["-hide_banner", "-i", file], { encoding: "utf8" });
const lines = (r.stderr || "").split("\n").filter((l) => /Duration|Stream|Video:|Audio:/.test(l));
console.log(lines.join("\n"));
const m = /Duration: (\d+):(\d+):(\d+\.\d+)/.exec(r.stderr || "");
if (m) console.log("seconds:", (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]));
