import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto("http://localhost:8787/?autorun=F01", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".result", { timeout: 180000 });
await page.waitForTimeout(1500);

const m = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      h: Math.round(r.height),
      sh: el.scrollHeight,
      ch: el.clientHeight,
    };
  };
  return {
    doc: { sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight },
    app: box(".app"),
    main: box(".main"),
    boardPanel: box(".board-panel"),
    frame: box(".board-frame"),
    side: box(".side"),
    head: box(".side-head"),
    log: box(".log"),
    result: box(".result"),
    entries: document.querySelectorAll(".entry").length,
    suspects: document.querySelectorAll(".suspects li").length,
  };
});

console.log(JSON.stringify(m, null, 2));
await browser.close();
