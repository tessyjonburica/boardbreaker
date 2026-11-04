// Checks a running BoardBreaker API: static assets, state, and one real
// six-probe diagnosis over SSE. Usage: node scripts/check-api.mjs [baseUrl]
const base = process.argv[2] ?? "http://127.0.0.1:8787";

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ${detail}` : ""}`);
  if (!ok) process.exitCode = 1;
}

const state = await (await fetch(`${base}/api/state`)).json();
check("GET /api/state", !!state.board, `board=${state.board?.name} faults=${state.faults?.length} points=${(state.testPoints ?? state.points ?? []).length}`);

const index = await fetch(`${base}/`);
const html = await index.text();
check('GET / serves built UI', index.ok && html.includes('id="root"'), `bytes=${html.length}`);

const png = await fetch(`${base}/board.png`);
check("GET /board.png", png.ok && (png.headers.get("content-type") ?? "").includes("image"), png.headers.get("content-type") ?? "");

const started = Date.now();
const ac = new AbortController();
const timer = setTimeout(() => ac.abort(), 150_000);
const res = await fetch(`${base}/api/diagnose`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ faultId: "F01", budget: 6 }),
  signal: ac.signal,
});
check("POST /api/diagnose streams", res.ok && (res.headers.get("content-type") ?? "").includes("event-stream"), `status=${res.status}`);

const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = "";
let final = null;
let probes = 0;
const deadline = Date.now() + 150_000;

while (Date.now() < deadline && !final) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  const frames = buf.split("\n\n");
  buf = frames.pop() ?? "";
  for (const frame of frames) {
    const evLine = frame.split("\n").find((l) => l.startsWith("event:"));
    const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
    if (!dataLine) continue;
    const evt = evLine ? evLine.slice(6).trim() : "message";
    let payload;
    try { payload = JSON.parse(dataLine.slice(5).trim()); } catch { continue; }
    if (evt === "probe") {
      probes++;
      console.log(`      probe ${probes}: ${payload.node} = ${payload.value}`);
    }
    if (evt === "final") final = payload.result;
    if (evt === "error") throw new Error(`agent error: ${payload.message}`);
  }
}
clearTimeout(timer);

const secs = ((Date.now() - started) / 1000).toFixed(1);
const top = final?.ranked?.[0];
check("agent returned a final result", !!final, final ? `in ${secs}s, faultId=${final.faultId}, top=${top?.ref} at ${top?.confidence}` : `timed out after ${secs}s`);
check("within six-probe budget", probes <= 6, `probes=${probes}`);
check("diagnosed F01 correctly", final?.faultId === "F01", `got ${final?.faultId}`);
check("solver cross-check present", Array.isArray(final?.verified) && final.verified.length > 0, JSON.stringify(final?.verified?.map((v) => v.faultId)));

