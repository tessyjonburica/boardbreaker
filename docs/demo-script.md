# Demo script

Target: 100–120 seconds. One board, one fault, one run.

## 0:00 — The problem

> A dead board usually means tracing the power tree by hand: input, fuse, diode,
> regulator, rails. Ten minutes, every time, and you need to know the board.

Show the BB-100 photo.

## 0:12 — Read the board

> BoardBreaker starts with a photo. SAM 3.1 segments the components, and a
> vision model reads the silkscreen into a component map.

Point at the component count in the legend: **19 parts read from the photo**.

## 0:25 — Pick a fault, run the agent

Choose **F01 · Blown input fuse**. Press **Run diagnosis**.

> The symptom is "completely dead, no LEDs". The agent gets a six-probe budget
> and the netlist. It chooses each measurement itself.

## 0:40 — Probes land

> First it checks the raw input: 9 volts, so the jack is fine.
> After the fuse: zero. That is the first break.
> A resistance check reads open, not a short, so the fuse is open rather than
> something downstream dragging the rail down.

The probe rings appear on the board as the readings arrive.

## 1:05 — Result

> F1, the polyfuse, at 96 percent. D1 is listed second with the reason it is
> not the cause: its upstream node is already dead.

Point at the ranked list and the boxes on the board.

> The solver re-simulates every known fault at the same three nodes and agrees.

## 1:20 — Close

> Eighteen fault cases on this bench. With six chosen probes the agent gets the
> top suspect right in twelve and the true fault in the top three in seventeen.
> The bench is simulated, and that is deliberate: the agent is evaluated against
> exact ground truth, not a lab notebook.

> The same loop runs on real measurements. That is the next step.

## Recording notes

- Use a 1440×900 or 1920×1080 window. The layout fits one screen, no scrolling.
- Run F01 first. It is the cleanest story: three probes, correct answer.
- Do not cut the probe wait entirely; a short speed-up (2–4×) shows the agent
  working without making the video drag.
- Keep the mouse still while the probes stream. Point only when the result lands.
- Record system audio or voice-over separately; the UI makes no sound.
