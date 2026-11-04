import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const OUT = "out/video";
mkdirSync(OUT, { recursive: true });

const CARD_CSS = `
  html, body { margin: 0; height: 100%; background: #0b0f0d; color: #e9efe9;
    font-family: "Segoe UI", system-ui, sans-serif; }
  .wrap { height: 100%; display: flex; flex-direction: column; justify-content: center;
    padding: 0 96px; gap: 18px; }
  .eyebrow { font: 500 13px/1 "Consolas", monospace; letter-spacing: 0.22em;
    text-transform: uppercase; color: #6f8f76; }
  h1 { font-size: 72px; margin: 0; letter-spacing: -0.03em; font-weight: 600; }
  p { font-size: 26px; line-height: 1.5; margin: 0; color: #a9bdb0; max-width: 900px; }
  ul { margin: 8px 0 0; padding-left: 22px; color: #a9bdb0; font-size: 22px; line-height: 1.7; }
  .rule { height: 1px; background: #1e2b22; margin: 10px 0 6px; }
  .small { font: 500 16px/1.6 "Consolas", monospace; color: #5f7a66; }
`;

function card(body) {
  return `data:text/html;charset=utf-8,${encodeURIComponent(
    `<!doctype html><html><head><meta charset="utf-8"><style>${CARD_CSS}</style></head><body><div class="wrap">${body}</div></body></html>`
  )}`;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();

async function caption(text) {
  await page.evaluate((t) => {
    let bar = document.getElementById("bb-caption");
    if (!bar) {
      const style = document.createElement("style");
      style.textContent = `
        #root { height: calc(100dvh - 104px) !important; }
        .app { height: 100% !important; }
        #bb-caption { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%);
          z-index: 9999; display: flex; align-items: center; gap: 12px;
          padding: 12px 20px 12px 16px; border-radius: 999px;
          background: rgba(10, 16, 12, 0.92); border: 1px solid #2a3b2f;
          box-shadow: 0 12px 32px rgba(0,0,0,0.45);
          color: #dfe9e0; font: 500 16px/1.35 "Consolas", monospace;
          max-width: 1100px; transition: opacity 220ms ease; }
        #bb-caption i { width: 7px; height: 7px; border-radius: 50%; background: #6ee7a0;
          flex: none; box-shadow: 0 0 10px #6ee7a0; }
      `;
      document.head.appendChild(style);
      bar = document.createElement("div");
      bar.id = "bb-caption";
      bar.innerHTML = '<i></i><span></span>';
      document.body.appendChild(bar);
    }
    bar.querySelector("span").textContent = t;
    bar.style.opacity = "1";
  }, text);
}

const started = Date.now();
const mark = (s) => console.log(`[${Math.round((Date.now() - started) / 1000)}s] ${s}`);

// ---- Title
await page.goto(
  card(`
    <p class="eyebrow">Meta AI Developer Hackathon / Indie track</p>
    <h1>BoardBreaker</h1>
    <p>Photograph a dead PCB, hand the model a multimeter, and get a ranked list of
       the parts most likely to be wrong, with the evidence behind each ranking.</p>
    <div class="rule"></div>
    <p class="small">SAM 3.1 / Muse / Llama / software-simulated bench / BB-100 sensor node</p>
  `)
);
mark("title");
await page.waitForTimeout(5200);

// ---- Case 1: F01 blown fuse
await page.goto("http://localhost:8787/?autorun=F01", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".board-frame img", { timeout: 60000 });
await page.waitForTimeout(1500);
await caption("F01 - board is dead. SAM 3.1 segments the photo and reads 18 silkscreen refs.");
mark("case1 start");
await page.waitForSelector(".entry", { timeout: 120000 });
await caption("No hand-written schematic: the netlist comes from the board map, so the agent probes upstream first.");
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 2, null, { timeout: 180000 });
await caption("TP1 VIN_RAW reads 9 V, TP10 downstream reads 0 V. Something between them is open.");
await page.waitForSelector(".result", { timeout: 180000 });
await caption("F1, the input fuse, at 96%: 7.7 M ohm across it rules out a short. The solver cross-check agrees exactly.");
mark("case1 done");
await page.waitForTimeout(6500);

// ---- Case 2: F13 stuck reset switch
await page.goto(
  card(`
    <p class="eyebrow">Second case / fresh context</p>
    <h1>Reset line held low</h1>
    <p>Nothing carries over from the first run. New symptom, new photo, six probes maximum.</p>
  `)
);
mark("card2");
await page.waitForTimeout(3600);

await page.goto("http://localhost:8787/?autorun=F13", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".board-frame img", { timeout: 60000 });
await page.waitForTimeout(1200);
await caption("F13 - the board never boots and the reset line measures low.");
mark("case2 start");
await page.waitForSelector(".entry", { timeout: 120000 });
await page.waitForFunction(() => document.querySelectorAll(".entry").length >= 3, null, { timeout: 120000 });
await caption("The 5 V rail checks out, so the fault is downstream. A 0 ohm read at RESET names the culprit.");
await page.waitForSelector(".result", { timeout: 180000 });
await caption("SW1, stuck closed, and the solver reaches the same part independently.");
mark("case2 done");
await page.waitForTimeout(6000);

// ---- Close
await page.goto(
  card(`
    <p class="eyebrow">What the numbers say</p>
    <h1>16 / 18 top-1, 18 / 18 with the solver</h1>
    <ul>
      <li>Six-probe budget, no retries, 18 injected fault cases</li>
      <li>Every run logged: probes asked, verdict, ground truth</li>
      <li>Bench is simulated; a USB meter adapter is the next step</li>
    </ul>
    <div class="rule"></div>
    <p class="small">TypeScript core / React UI / SSE streaming / every run reproducible</p>
  `)
);
mark("end card");
await page.waitForTimeout(6000);

const video = await page.video();
const path = await video.path();
mark(`recorded -> ${path}`);
await context.close();
await browser.close();
