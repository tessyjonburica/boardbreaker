import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

mkdirSync("out/video", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: "out/video", size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const started = Date.now();

await page.goto("http://localhost:8787/?autorun=F01", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".result", { timeout: 300000 });
await page.waitForTimeout(6000);

const video = page.video();
const path = await video.path();
console.log(`recorded ${Math.round((Date.now() - started) / 1000)}s -> ${path}`);
await context.close();
await browser.close();

