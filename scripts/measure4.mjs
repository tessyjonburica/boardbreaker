import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto("http://localhost:8787/?autorun=F01", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".board-frame img", { timeout: 60000 });
await page.addStyleTag({ content: "#root{height:calc(100dvh - 104px) !important} .app{height:100% !important}" });
await page.waitForSelector(".result", { timeout: 180000 });
await page.waitForTimeout(1200);

const m = await page.evaluate(() => {
  const b = (s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    return [Math.round(r.top), Math.round(r.bottom), Math.round(r.height), el.scrollHeight - el.clientHeight];
  };
  return { root: b("#root"), app: b(".app"), log: b(".log"), result: b(".result"), overflowPx: document.querySelector(".result").scrollHeight - document.querySelector(".result").clientHeight };
});
console.log(JSON.stringify(m));
await page.screenshot({ path: "out/video/state-gutter.png" });
await browser.close();
