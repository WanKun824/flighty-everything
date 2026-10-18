import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: [["list"], ["html", { outputFolder: "build/ui-acceptance-report", open: "never" }]],
  outputDir: "build/ui-acceptance-results",
  use: {
    baseURL: "http://127.0.0.1:3007",
    channel: "chrome",
    viewport: { width: 402, height: 874 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : {},
  },
  projects: [
    { name: "light", use: { colorScheme: "light" } },
    { name: "dark", use: { colorScheme: "dark" } },
    { name: "small-phone", use: { colorScheme: "light", viewport: { width: 320, height: 667 } } },
  ],
  webServer: {
    command: "npm run dev -- --port 3007 --hostname 127.0.0.1",
    url: "http://127.0.0.1:3007",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
  },
});
