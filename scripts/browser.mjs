// Resolves a Chromium executable for Playwright and Lighthouse on any OS.
// Prefers Playwright's own download; falls back to a preinstalled browser
// (PLAYWRIGHT_CHROMIUM_EXECUTABLE, or /opt/pw-browsers/chromium in Claude's cloud VM).
import { existsSync } from 'node:fs'

import { chromium } from '@playwright/test'

export function resolveChromium() {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  const bundled = chromium.executablePath()
  if (existsSync(bundled)) return bundled
  const cloud = '/opt/pw-browsers/chromium'
  if (existsSync(cloud)) return cloud
  return undefined
}
