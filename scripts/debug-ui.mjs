import { chromium } from "playwright-core";

const BASE = "http://localhost:8787";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => console.log("console:", m.type(), m.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("pageerror:", String(e).slice(0, 300)));
page.on("requestfailed", (r) => console.log("reqfail:", r.url(), r.failure()?.errorText));
await page.goto(BASE + "/?autorun=F01", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(12000);
const info = await page.evaluate(() => ({
  head: document.querySelector(".panel-head")?.innerText,
  status: document.querySelector(".budget")?.getAttribute("aria-label"),
  entries: document.querySelectorAll(".entry").length,
  err: document.querySelector(".error")?.textContent,
  result: !!document.querySelector(".result"),
  inline: !!document.querySelector(".meter-inline"),
  run: document.querySelector(".run")?.textContent,
}));
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: "out/shots/debug.png" });
await browser.close();
