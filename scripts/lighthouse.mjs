// Runs Lighthouse (mobile) against the production preview and enforces the plan's budgets.
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'

import { resolveChromium } from './browser.mjs'

const PORT = 4174
const URL_UNDER_TEST = `http://127.0.0.1:${PORT}/`
const THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.95,
  'best-practices': 0.9,
  lcpMs: 2500,
  cls: 0.1,
  tbtMs: 200,
}

async function startPreview() {
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const child = spawn(cmd, ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`preview exited with ${child.exitCode}`)
    try {
      const res = await fetch(URL_UNDER_TEST)
      if (res.ok) return child
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  child.kill()
  throw new Error('preview server did not start within 30s')
}

const preview = await startPreview()
const chromePath = resolveChromium()
const chrome = await launch({
  chromePath,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
})

try {
  const result = await lighthouse(URL_UNDER_TEST, {
    port: chrome.port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices'],
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 412,
      height: 915,
      deviceScaleFactor: 2.6,
      disabled: false,
    },
    throttlingMethod: 'simulate',
  })
  if (!result) throw new Error('Lighthouse returned no result')
  const { lhr } = result
  mkdirSync('reports', { recursive: true })
  writeFileSync('reports/lighthouse.json', JSON.stringify(lhr, null, 2))

  const score = (id) => lhr.categories[id]?.score ?? 0
  const metric = (id) => lhr.audits[id]?.numericValue ?? Number.POSITIVE_INFINITY
  const rows = [
    [
      'performance',
      score('performance'),
      THRESHOLDS.performance,
      (v) => v >= THRESHOLDS.performance,
    ],
    [
      'accessibility',
      score('accessibility'),
      THRESHOLDS.accessibility,
      (v) => v >= THRESHOLDS.accessibility,
    ],
    [
      'best-practices',
      score('best-practices'),
      THRESHOLDS['best-practices'],
      (v) => v >= THRESHOLDS['best-practices'],
    ],
    [
      'LCP (ms)',
      metric('largest-contentful-paint'),
      THRESHOLDS.lcpMs,
      (v) => v <= THRESHOLDS.lcpMs,
    ],
    ['CLS', metric('cumulative-layout-shift'), THRESHOLDS.cls, (v) => v <= THRESHOLDS.cls],
    ['TBT (ms)', metric('total-blocking-time'), THRESHOLDS.tbtMs, (v) => v <= THRESHOLDS.tbtMs],
  ]
  let failed = false
  for (const [name, value, limit, ok] of rows) {
    const pass = ok(value)
    failed ||= !pass
    const shown =
      typeof value === 'number' ? (value <= 1 ? value.toFixed(2) : Math.round(value)) : value
    console.log(
      `${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(16)} ${String(shown).padStart(8)}  (limit ${limit})`,
    )
  }
  if (failed) {
    console.error('Lighthouse budget failed. Full report: reports/lighthouse.json')
    process.exitCode = 1
  }
} finally {
  await chrome.kill()
  preview.kill()
}
