import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadApiKey(): string {
  let key = process.env.MODEL_API_KEY ?? "";
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    const line = raw.split(/\r?\n/).find((l) => l.startsWith("MODEL_API_KEY="));
    if (line) key = line.slice("MODEL_API_KEY=".length).trim();
  } catch {
    // fall back to process env
  }
  if (!key || key.startsWith("replace-with")) {
    throw new Error("MODEL_API_KEY is missing. Add it to .env.local.");
  }
  return key;
}

export async function metaFetch(path: string, body: unknown, stream = false): Promise<Response> {
  const res = await fetch(`https://api.meta.ai/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loadApiKey()}`,
      "Content-Type": "application/json",
      ...(stream ? { Accept: "text/event-stream" } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API ${res.status}: ${text.slice(0, 500)}`);
  }
  return res;
}

export async function metaJson<T>(path: string, body: unknown): Promise<T> {
  const res = await metaFetch(path, body);
  return (await res.json()) as T;
}

/** Consume the Responses API SSE stream and return the concatenated text lane. */
export async function readTextStream(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const evt of events) {
      for (const line of evt.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          if (json.type === "response.output_text.delta" && json.delta) {
            text += json.delta;
          }
        } catch {
          // ignore keepalive or partial frames
        }
      }
    }
  }
  return text;
}
