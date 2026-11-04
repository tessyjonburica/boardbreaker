const { execFileSync } = require('child_process');
const ff = require('ffmpeg-static');
const times = process.argv.slice(2);
for (const t of times) {
  execFileSync(ff, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', t, '-i', 'out/video/boardbreaker-demo-2.mp4',
    '-frames:v', '1', `out/video/shot-${t.replace(':', 'm')}.png`,
  ]);
  console.log(`shot-${t}`);
}
