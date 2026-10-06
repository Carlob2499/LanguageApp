import { existsSync } from 'node:fs'

import { chromium, defineConfig, devices } from '@playwright/test'

const port = 4173
const baseURL = `http://127.0.0.1:${port}`
const includeWebKit = Boolean(process.env.CI) || process.env.PW_WEBKIT === '1'

// Prefer Playwright's own Chromium; fall back to a preinstalled one (Claude's cloud VM ships
// /opt/pw-browsers/chromium). Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to override on any OS.
function chromiumExecutable(): string | undefined {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  if (existsSync(chromium.executablePath())) return undefined
  const cloud = '/opt/pw-browsers/chromium'
  return existsSync(cloud) ? cloud : undefined
}
const executablePath = chromiumExecutable()
const chromiumLaunch = executablePath ? { launchOptions: { executablePath } } : {}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium-phone',
      use: { ...devices['Pixel 7'], browserName: 'chromium', ...chromiumLaunch },
    },
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        ...chromiumLaunch,
      },
    },
    ...(includeWebKit
      ? [{ name: 'webkit-phone', use: { ...devices['iPhone 15'], browserName: 'webkit' as const } }]
      : []),
  ],
})
