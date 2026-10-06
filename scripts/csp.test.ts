import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * index.html carries one inline script (the boot script that hides the prerendered welcome for
 * returning learners). The CSP in vercel.json allows exactly that script by hash, so any edit
 * to it must update the hash too, or production would block it.
 */
describe('content security policy', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
  const vercel = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>
  }
  const csp = vercel.headers
    .flatMap((h) => h.headers)
    .find((h) => h.key === 'Content-Security-Policy')!.value

  it('allows the inline boot and loader scripts by hash and nothing else inline', () => {
    const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    expect(scripts).toHaveLength(2)
    const hashes = scripts.map(
      (m) => `'sha256-${createHash('sha256').update(m[1]!).digest('base64')}'`,
    )
    const scriptSrc = /script-src ([^;]+)/.exec(csp)![1]!
    expect(scriptSrc.split(' ')).toEqual(["'self'", ...hashes])
    expect(csp).not.toContain("'unsafe-inline' 'unsafe-eval'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('keeps the inline scripts free of network access and HTML injection', () => {
    for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      expect(m[1]).not.toMatch(/fetch|XMLHttpRequest|import\(|eval|document\.write|innerHTML/)
    }
    expect(html).toContain('kintsugi.settings')
  })
})
