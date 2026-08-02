import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Playwright E2E configuration (POM-044). `webServer` builds and serves the
 * real production build (`next build && next start`) rather than `next
 * dev`, per doc 07_Verification_and_Validation.pdf's release gate running
 * E2E "against production-like build" and its Release Gate command list
 * (`npm run test:e2e` after `npm run build`).
 *
 * Browser matrix (doc 07, section 6 -- "current stable Chromium, Firefox, and
 * Safari/WebKit"): only the `chromium` project is enabled by default here,
 * since this sandbox only has the Chromium browser binary installed
 * (`npx playwright install chromium`). The `firefox`/`webkit` projects
 * below are ready to enable once `npx playwright install firefox webkit`
 * has been run in an environment with the disk space/network access for
 * those additional browser downloads.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // All specs share one `next start` server (single Node process, no
  // per-worker instance) and this suite's own timer/reload/persistence
  // assertions are wall-clock-timing-sensitive -- running the full default
  // worker count (one per CPU core) was observed to reliably starve that
  // one server under load and produce spurious 30s timeouts/lost-write
  // races on this environment, not real product bugs (verified by re-running
  // the identical failures at `--workers=2`, where all specs pass). Capped
  // rather than removing `fullyParallel` so specs still run concurrently,
  // just with a ceiling the shared server can keep up with.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
