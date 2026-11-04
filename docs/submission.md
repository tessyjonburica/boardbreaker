# Submission draft

## Title

BoardBreaker

## Tagline

PCB fault isolation from a board photo and six probe readings.

## Track

Indie developer

## Theme

Push the Frontier — giving a machine a new capability in manufacturing and
repair.

## Short description (280 characters)

BoardBreaker reads a PCB photo with SAM 3.1, maps the components from the
silkscreen, then uses Muse Spark to choose a handful of multimeter probes under
a budget and ranks the likely fault. A DC solver cross-checks every hypothesis
at the same nodes.

## Long description

A dead circuit board usually means tracing the power tree by hand: input,
protection, regulator, rails, loads. It takes experience, it is repetitive, and
the first measurements are the same on every board.

BoardBreaker does the tracing. It takes a board photo, uses SAM 3.1 to segment
the components, and reads the silkscreen into a component map. Given a symptom
and a netlist, Muse Spark plans the next measurement, explains what it expects
to rule out, and updates on the reading. It works under a hard six-probe budget
and returns ranked suspects with evidence for each.

A DC solver then re-simulates every known fault mode at the exact nodes the
agent probed and checks which hypothesis fits. The model decides where to look;
the physics decides what fits.

Results on an 18-fault benchmark under a six-probe budget: the agent alone is
16/18 top-1 and 17/18 top-3, and the same probes re-checked by the DC solver
reach 18/18. A deterministic full 15-probe sweep gets 17/18 top-1, so the agent
reaches a better answer with less than half the measurements.

There is no physical hardware in this build. The BB-100 is a synthetic sensor
node with a nodal-analysis solver behind it, so every reading is generated from
a board with a planted fault and the ground truth is exact. The product loop is
the same with real probes; the bench boundary is two functions.

## Built with

- Meta Model API
- SAM 3.1 for segmentation
- Muse Spark 1.3 for vision and structured reasoning
- TypeScript, Node.js, React, Vite, Express
- Modified nodal analysis for the DC bench

## Links

- Repo: (push `boardbreaker/` and paste the URL here)
- Video: `docs/boardbreaker-demo.mp4` (35s, 1440x900, 2.6 MB, silent) — upload and paste the URL here
- Demo: `npm start`, then http://localhost:8787

## Submission checklist

- [x] Tests pass: `npm test` 9/9
- [x] Type-check clean: `npx tsc --noEmit`
- [x] Production build: `npx vite build`
- [x] Runtime proof: `npm run check` against the live API (8/8)
- [x] Demo video recorded
- [x] Results table matches `docs/results.md`
- [ ] Video uploaded, URL pasted above
- [ ] Repo pushed, URL pasted above

## What is next

A hardware adapter (bench supply, DMM, switch matrix) so the same agent drives
real probes; netlist inference from the photo plus continuity tests; multi-fault
hypotheses.
