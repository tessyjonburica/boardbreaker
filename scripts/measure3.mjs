import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto("http://localhost:8787/?autorun=F01", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".result", { timeout: 180000 });

const m = await page.evaluate(() => {
  const side = document.querySelector(".side");
  const kids = [...side.children].map((el) => {
    const r = el.getBoundingClientRect();
    return {
      cls: el.className,
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      h: Math.round(r.height),
      sh: el.scrollHeight,
    };
  });
  const res = document.querySelector(".result");
  const sub = [...res.children].map((el) => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: el.className, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
  });
  return { kids, resultBox: res.getBoundingClientRect().bottom, sub, logEntries: document.querySelectorAll(".entry").length };
});

console.log(JSON.stringify(m, null, 2));
await page.screenshot({ path: "out/video/state-result.png" });
await browser.close();
