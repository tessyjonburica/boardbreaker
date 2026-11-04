// End-to-end smoke test against the running API.
// Usage: node scripts/smoke.cjs [faultId]
const base = process.env.BB_BASE || "http://127.0.0.1:8787";
const fault = (process.argv[2] || "F13").toUpperCase();

function parseSse(text) {
  const out = [];
  for (const block of text.split("\n\n")) {
    if (!block.trim()) continue;
    let event = "message";
    const data = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trim());
    }
    if (!data.length) continue;
    try { out.push({ event, data: JSON.parse(data.join("\n")) }); } catch { /* ignore */ }
  }
  return out;
}

async function main() {
  const state = await fetch(`${base}/api/state`);
  if (!state.ok) throw new Error(`state ${state.status}`);
  const s = await state.json();
  const f = s.faults?.find((x) => x.id === fault) || s.fault;
  console.log(`state ok: fault=${f?.id ?? "?"} label="${f?.label ?? ""}"`);

  const board = await fetch(`${base}/board.png`);
  console.log(`board.png ${board.status} ${(await board.arrayBuffer()).byteLength} bytes`);

  const res = await fetch(`${base}/api/diagnose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ faultId: fault, budget: 6 }),
  });
  if (!res.ok) throw new Error(`diagnose ${res.status} ${await res.text()}`);
  const events = parseSse(await res.text());
  const kinds = {};
  for (const e of events) kinds[e.event] = (kinds[e.event] || 0) + 1;
  console.log("events:", JSON.stringify(kinds));

  const final = events.find((e) => e.event === "final");
  if (!final) throw new Error("no final event");
  const r = final.data.result;
  const ranked = r.suspects || r.ranked || [];
  console.log("top-3:", ranked.slice(0, 3).map((x) => `${x.ref}:${x.score ?? x.confidence}`).join(" "));
  console.log("expected:", (final.data.expected || []).join(" / "));
  console.log("verified:", (r.verified || []).map((v) => `${v.faultId}:${v.score}`).join(",") || "none");
  const hit = ranked.slice(0, 3).some((x) => (final.data.expected || []).includes(x.ref));
  console.log(hit ? "PASS top-3 hit" : "FAIL top-3 miss");
  if (!hit) process.exitCode = 1;
}

main().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
