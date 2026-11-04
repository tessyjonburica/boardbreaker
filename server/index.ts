import express from "express";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BB100 } from "../src/bench/board.js";
import { FAULTS } from "../src/bench/faults.js";
import { diagnoseCase } from "../src/agent/diagnose.js";
import type { ComponentMap } from "../src/vision/map.js";

const app = express();
app.use(express.json());

const map: ComponentMap = JSON.parse(readFileSync(resolve("out/component-map.json"), "utf8"));
const image = resolve("out/bb100.png");

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, board: BB100.id, engine: "merge-ranking/1" });
});

app.get("/api/state", (_req, res) => {
  res.json({
    board: {
      id: BB100.id,
      name: BB100.name,
      description: BB100.description,
      width: 1300,
      height: 960,
      testPoints: BB100.testPoints,
      components: BB100.components.map((c) => ({
        id: c.id,
        ref: c.ref,
        type: c.type,
        value: c.value,
        footprint: c.footprint,
        section: c.section,
      })),
    },
    map,
    faults: FAULTS.map((f) => ({ id: f.id, label: f.label, symptom: f.symptom })),
  });
});

app.get("/board.png", (_req, res) => res.sendFile(image));

app.post("/api/diagnose", async (req, res) => {
  const fault = FAULTS.find((f) => f.id === req.body?.faultId);
  if (!fault) {
    res.status(400).json({ error: "unknown faultId" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const budget = Number(req.body?.budget ?? 6);
  send("start", { faultId: fault.id, symptom: fault.symptom, budget });

  try {
    const result = await diagnoseCase(BB100, fault, map, budget, (event) => {
      if (event.type === "probe") send("probe", event);
    });
    send("final", { result, expected: fault.expectedSuspects });
    res.end();
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : String(err) });
    res.end();
  }
});

const dist = resolve("web/dist");
app.use(express.static(dist));
app.get(/.*/, (_req, res) => res.sendFile(resolve(dist, "index.html")));

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`BoardBreaker API on http://localhost:${port}`);
});
