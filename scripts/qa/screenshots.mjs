// Visual QA: walks the key screens at several viewports and writes PNGs to reports/screenshots.
// Usage: node scripts/qa/screenshots.mjs [--base http://127.0.0.1:4173] [--scheme dark|light] [--reduced]
import { mkdirSync } from 'node:fs'

import { chromium } from '@playwright/test'

import { resolveChromium } from '../browser.mjs'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const base = opt('--base', 'http://127.0.0.1:4173')
const scheme = opt('--scheme', 'dark')
const reduced = args.includes('--reduced')
const out = `reports/screenshots/${scheme}${reduced ? '-reduced' : ''}`
mkdirSync(out, { recursive: true })

const viewports = {
  'phone-small': {
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  'phone-large': {
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  tablet: {
    viewport: { width: 834, height: 1194 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
}

const browser = await chromium.launch({ executablePath: resolveChromium() })
for (const [name, device] of Object.entries(viewports)) {
  const ctx = await browser.newContext({
    ...device,
    colorScheme: scheme,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    baseURL: base,
  })
  const page = await ctx.newPage()
  const shot = (label) => page.screenshot({ path: `${out}/${name}-${label}.png` })
  await page.goto('/')
  await page.waitForSelector('h1')
  await page.waitForTimeout(1500)
  await shot('welcome')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('radio', { name: /^漢/ }).click()
  await shot('welcome-kana')
  await page.getByRole('button', { name: 'Pick a level myself' }).click()
  await shot('welcome-level')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Begin' }).click()
  await page.waitForURL(/\/$/)
  await page.waitForSelector('h1')
  await page.waitForTimeout(600)
  await shot('today')
  await page.getByRole('link', { name: 'Learn new cards' }).click()
  await page.waitForSelector('[role=progressbar]')
  await page.waitForTimeout(600)
  await shot('review-prompt')
  const reveal = page.getByRole('button', { name: 'Reveal' })
  if (await reveal.isVisible()) await reveal.click()
  else {
    await page.getByLabel('Type the reading in kana or romaji').fill('eki')
    await page.getByRole('button', { name: 'Check' }).click()
  }
  await page.waitForTimeout(500)
  await shot('review-answer')
  await page.goto('/library')
  await page.waitForSelector('h1')
  await page.waitForTimeout(800)
  await shot('library')
  await page.getByRole('link', { name: /^日/ }).first().click()
  await page.waitForSelector('article')
  await page.waitForTimeout(1200)
  await shot('kanji')
  await page.goto('/progress')
  await page.waitForSelector('h1')
  await page.waitForTimeout(500)
  await shot('progress')
  await page.goto('/settings')
  await page.waitForSelector('h1')
  await shot('settings')
  await page.goto('/about')
  await page.waitForSelector('h1')
  await page.waitForTimeout(500)
  await shot('sources')
  await ctx.close()
  console.log(`${name}: 11 screenshots`)
}
await browser.close()
console.log(`Screenshots in ${out}`)
