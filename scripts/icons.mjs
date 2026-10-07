// Renders the app icon (SVG, drawn in code) to the PNG sizes the manifest needs, using Playwright.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { chromium } from '@playwright/test'

import { resolveChromium } from './browser.mjs'

const svg = readFileSync('public/icons/icon.svg', 'utf8')
const sizes = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-512-maskable.png', 512, true],
  ['apple-touch-icon.png', 180, true],
]
mkdirSync('public/icons', { recursive: true })

const browser = await chromium.launch({ executablePath: resolveChromium() })
const page = await browser.newPage()
for (const [name, size, padded] of sizes) {
  await page.setViewportSize({ width: size, height: size })
  const inner = padded ? Math.round(size * 0.8) : size
  const offset = Math.round((size - inner) / 2)
  await page.setContent(
    `<html><body style="margin:0;background:${padded ? '#0C1018' : 'transparent'};width:${size}px;height:${size}px">
      <div style="position:absolute;left:${offset}px;top:${offset}px;width:${inner}px;height:${inner}px">${svg}</div>
    </body></html>`,
  )
  const buffer = await page.screenshot({ omitBackground: !padded, type: 'png' })
  writeFileSync(`public/icons/${name}`, buffer)
  console.log(`wrote public/icons/${name}`)
}
await browser.close()
