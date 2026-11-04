import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
let key = process.env.MODEL_API_KEY ?? "";

try {
  const raw = readFileSync(envPath, "utf8");
  const line = raw.split(/\r?\n/).find((l) => l.startsWith("MODEL_API_KEY="));
  if (line) key = line.slice("MODEL_API_KEY=".length).trim();
} catch {
  // no env file; fall through to process env
}

if (!key || key.startsWith("replace-with")) {
  console.error("MODEL_API_KEY is not set. Edit .env.local and paste the key.");
  process.exit(1);
}

const res = await fetch("https://api.meta.ai/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "muse-spark-1.3",
    input: "Reply with exactly: OK",
  }),
});

const text = await res.text();
console.log(`status: ${res.status}`);
console.log(text.slice(0, 800));
process.exit(res.ok ? 0 : 1);
