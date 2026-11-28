import { defineConfig } from "@playwright/test";
const browserName =
  process.env.TEST_BROWSER === "webkit" ? "webkit" : "chromium";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 180000,
  use: {
    actionTimeout: 15000,
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:5180",
    browserName,
    channel:
      browserName === "chromium"
        ? process.env.PLAYWRIGHT_CHANNEL || "chromium"
        : undefined,
    headless: true,
    acceptDownloads: true,
    launchOptions: {
      args:
        browserName === "chromium"
          ? ["--autoplay-policy=no-user-gesture-required"]
          : [],
    },
  },
  workers: 1,
  reporter: "list",
  outputDir: "outputs/test-results",
});
