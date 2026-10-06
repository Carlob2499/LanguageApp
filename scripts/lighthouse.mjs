// Runs Lighthouse (mobile) against the production preview and enforces the plan's budgets.
// Simulated throttling is sensitive to CPU noise on shared machines, so each number is the
// median of three runs.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

import { launch } from 'chrome-launcher'
import lighthouse from 'lighthouse'

import { resolveChromium } from './browser.mjs'

const PORT = 4174
const URL_UNDER_TEST = `http://127.0.0.1:${PORT}/`
const RUNS = 3
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

async function runOnce(port) {
  const result = await lighthouse(URL_UNDER_TEST, {
    port,
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
  return result.lhr
}

const preview = await startPreview()
const chrome = await launch({
  chromePath: resolveChromium(),
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
})

try {
  const runs = []
  for (let i = 0; i < RUNS; i++) runs.push(await runOnce(chrome.port))
  mkdirSync('reports', { recursive: true })
  writeFileSync('reports/lighthouse.json', JSON.stringify(runs[0], null, 2))

  const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
  const score = (id) => median(runs.map((r) => r.categories[id]?.score ?? 0))
  const metric = (id) =>
    median(runs.map((r) => r.audits[id]?.numericValue ?? Number.POSITIVE_INFINITY))
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
    const shown = value <= 1 ? value.toFixed(2) : Math.round(value)
    console.log(
      `${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(16)} ${String(shown).padStart(8)}  (limit ${limit}, median of ${RUNS})`,
    )
  }
  if (failed) {
    console.error('Lighthouse budget failed. First run saved to reports/lighthouse.json')
    process.exitCode = 1
  }
} finally {
  await chrome.kill()
  preview.kill()
}
