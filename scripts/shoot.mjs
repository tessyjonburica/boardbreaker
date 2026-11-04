// Captures the UI states for design review: idle, mid-run, result, part
// inspection, and mobile. Usage: node scripts/shoot.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:8787";
mkdirSync("out/shots", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function desktop() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/?autorun=F01", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "out/shots/1-idle.png" });

  await page.waitForSelector(".meter-inline", { timeout: 120000 });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: "out/shots/2-running.png" });

  await page.waitForSelector(".result", { timeout: 180000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "out/shots/3-result.png" });

  await page.locator('[aria-label^="U1,"]').hover({ force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "out/shots/4-hover.png" });

  await page.close();
}

async function mobile() {
  const page = await browser.newPage({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(BASE + "/?autorun=F07", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".result", { timeout: 180000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "out/shots/5-mobile.png", fullPage: true });
  await page.close();
}

await desktop();
await mobile();
await browser.close();
console.log("shots written to out/shots");

