import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleIssues = [];
page.on("console", (msg) => {
  const type = msg.type();
  if (type === "error" || type === "warning") {
    consoleIssues.push(`[${type}] ${msg.text()}`);
  }
});
page.on("pageerror", (err) => consoleIssues.push(`[pageerror] ${err.message}`));

await page.goto("http://localhost:3100");
await page.getByRole("button", { name: "Start" }).click();
await page.waitForTimeout(1500);

console.log("--- reloading with a running timer in localStorage ---");
consoleIssues.length = 0;
await page.reload();
await page.waitForTimeout(1000);

console.log(JSON.stringify(consoleIssues, null, 2));
await browser.close();
