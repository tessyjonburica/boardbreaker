import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:8787/?autorun=F01", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".result", { timeout: 300000 });
await page.waitForTimeout(2500);

const m = await page.evaluate(() => {
  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      h: Math.round(r.height),
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
    };
  };
  return {
    log: box(".log"),
    result: box(".result"),
    head: box(".side-head"),
    ranked: box(".result .ranked, .result .suspects"),
    items: [...document.querySelectorAll(".result [class*=suspect], .result li")].map((e) => ({
      cls: e.className,
      h: Math.round(e.getBoundingClientRect().height),
    })),
    viewport: { w: innerWidth, h: innerHeight },
  };
});
console.log(JSON.stringify(m, null, 2));
await browser.close();
