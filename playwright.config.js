import { defineConfig, devices } from '@playwright/test'
const BASE = 'http://localhost:4173/gomeasure-rubric-reviewer/'
export default defineConfig({
  testDir: './tests', fullyParallel: true, forbidOnly: !!process.env.CI, retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }]] : 'list',
  use: { baseURL: BASE, trace: 'on-first-retry', viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 },
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01, threshold: 0.2 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run preview', url: BASE, reuseExistingServer: !process.env.CI, timeout: 120_000 },
})
