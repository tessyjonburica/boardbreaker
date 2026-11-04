# BoardBreaker — demo video brief

Everything needed to cut the video: what the project is, what is built, and a
second-by-second script that matches the recording already in
`out/video/boardbreaker-demo.mp4` (95 s, 1440×900, 30 fps, silent with burned-in
captions). Regenerate it with `node scripts/record-demo.mjs` if a re-shoot is
needed; the app auto-runs a case with `?autorun=F13`.

## The project in one line

BoardBreaker turns a phone photo of a broken PCB plus a handful of multimeter
readings into a ranked list of the components most likely to be at fault.

## Facts to state on camera (all true and reproducible)

- Board under test: BB-100 Sensor Node — 20 components, 10 test points, 9 V input
  regulated to 5 V and 3.3 V, ATmega328P, LEDs, crystal, reset network.
- Vision: SAM 3.1 segments the photo; silkscreen text is read back and mapped to
  component references — 18 of 18 visible refs resolved, cached in
  `out/component-map.json`.
- Agent: a Meta model plans probes under a hard 6-probe budget, reads the
  readings, and returns structured JSON (probe / diagnose) that streams to the UI
  over SSE. No retries, no hidden extra probes.
- Physics: an independent nodal solver simulates all 18 injected fault cases and
  checks which fault reproduces the exact readings taken. Parts backed by an
  exact simulation fit are tagged `physics` and rank above model-only guesses.
- Accuracy, stated honestly: model alone 16/18 top-1; model + solver 18/18 by
  suspect. F10 (MCU VCC short) is the case the model misses and the solver
  rescues — say so, it is the point of the architecture.
- Bench is software-simulated; a USB multimeter adapter is the next step. Do not
  claim field measurements.

## Script (75 s of speech over 95 s of picture)

| Time | On screen | Voiceover |
| ---- | --------- | --------- |
| 0:00–0:08 | Title card | "BoardBreaker. A broken board, a photo, and a multimeter — and where to probe next." |
| 0:08–0:20 | Board view, F13 loaded | "This is a BB-100 sensor node with a fault injected. The reset line reads wrong and the board never boots. Twenty components, ten test points, six probes allowed." |
| 0:20–0:34 | Probes 01–03 appearing, pips filling | "The agent starts where a technician would: raw input, then after the fuse, then after the diode. Nine volts is present, so the supply is fine and the problem is downstream." |
| 0:34–0:48 | Probe 04: 5 V up, RESET at 0 Ω; suspects build | "Then the measurement that decides it: five volts is good, but RESET sits at zero ohms to ground. A pull-up cannot do that. A closed switch can." |
| 0:48–0:58 | Result: SW1 95%, `physics` tag, solver line | "SW1, the reset switch, stuck closed. And the physics solver reaches the same part independently, by simulating all eighteen fault modes against exactly these readings." |
| 0:58–1:20 | Second case, F01 rail short, faster run | "Second case: a shorted rail. The model reads the collapsing 5-volt node, the solver confirms which capacitor, and the ranked list narrows to one part in six probes." |
| 1:20–1:30 | Result panel, probe log scrolling | "Every probe is logged with the reason it was chosen, the verdict, and the ground truth — so the run can be audited, not just trusted." |
| 1:30–1:35 | End card | "Sixteen of eighteen top-1 with the model alone, eighteen of eighteen with the solver. Simulated bench today, a real meter next." |

## Shot list if re-recording from scratch

1. Title card (dark, product name, one line).
2. Wide shot of the board with test-point markers and the fault dropdown.
3. Probe log filling one entry at a time — do not cut mid-probe, the pips show the
   budget being spent.
4. Result state: top suspect with confidence, `physics` tag, solver cross-check
   line, probe/node/time counters, bench truth.
5. One contrast case (a rail short) to show it is not a one-trick demo.
6. End card with the numbers and the honesty line about the simulated bench.

## Recording rules that keep it clean

- 1440×900, browser at 100% zoom, no OS chrome, no notifications.
- Use `?autorun=<FAULT_ID>` so timings are deterministic; never hand-click on
  camera.
- Keep the mouse still — hover states are baked into the recording otherwise.
- Captions carry the argument; a silent video with good captions beats narration
  recorded in a noisy room.

## Submission checklist

1. Upload `out/video/boardbreaker-demo.mp4` to YouTube as **Unlisted** (or Loom),
   title "BoardBreaker — PCB fault isolation with Meta models", copy the link.
2. Paste the fields below into the submission form.
3. Attach or link `docs/screenshot.png` as the cover image.

### Form fields

- **Project name:** BoardBreaker
- **Tagline:** A photo and a few meter readings become a ranked list of faulty
  parts — with the physics to back it.
- **Track:** Indie / Push the Frontier
- **What it does:** BoardBreaker photographs a PCB, uses SAM 3.1 to segment parts
  and read silkscreen references, then runs a Meta model as a diagnostic agent
  that chooses multimeter probes under a six-probe budget. Each answer is
  cross-checked by a nodal circuit solver that simulates 18 fault modes against
  the exact readings taken, so a part only ranks first if the physics agrees.
- **How it was built:** TypeScript core (bench model, DC solver, fault injection,
  agent, evaluation harness), Express API streaming SSE, React + Vite interface
  with board overlay, Node 24 + vitest (21 tests). SAM 3.1 and a Meta model via
  the Model API; API key in `.env.local`, never in the repo.
- **Results:** 16/18 top-1 with the model alone, 18/18 by suspect with the solver
  cross-check, on 18 injected faults, six probes each, no retries.
- **Real-board ingestion:** the ingestion path was checked against a real
  open-hardware design, the Olimex ESP32-DevKit-LiPo Rev C KiCad netlist (54
  parts, 72 nets, Apache-2.0). The parser resolves it; that is not the same as
  a validated diagnosis of that board, and the results above are all BB-100.
- **Honest limitation:** the bench is simulated; a USB multimeter adapter is the
  next step before field use.
