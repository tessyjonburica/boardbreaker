import type { BoardState } from "./types";

export async function fetchState(): Promise<BoardState> {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error(`Board state request failed (${res.status})`);
  return res.json();
}

/**
 * Reads the SSE stream from the diagnose endpoint. Resolves when the server
 * closes the stream. `on` receives every event with its parsed payload.
 */
export async function streamDiagnosis(
  faultId: string,
  budget: number,
  on: (event: string, data: any) => void,
): Promise<void> {
  const res = await fetch("/api/diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ faultId, budget }),
  });
  if (!res.ok || !res.body) throw new Error(await res.text());

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf("\n\n");
    while (cut >= 0) {
      const chunk = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      let event = "message";
      let data = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) on(event, JSON.parse(data));
      cut = buffer.indexOf("\n\n");
    }
  }
}
