import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { answerCard, onboard } from './helpers'

/** The production Content-Security-Policy, as vercel.json ships it. */
function productionCsp(): string {
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
    headers: Array<{ headers: Array<{ key: string; value: string }> }>
  }
  const csp = vercel.headers
    .flatMap((h) => h.headers)
    .find((h) => h.key === 'Content-Security-Policy')!.value
  // The preview server is plain http on localhost. WebKit (unlike Chromium) would upgrade every
  // subresource to https there and fail the TLS handshake, so the directive is left out; the
  // header itself is asserted separately in csp.test.ts.
  return csp.replace(/;?\s*upgrade-insecure-requests/, '')
}

test.describe('pwa', () => {
  test('the production CSP allows everything the app does, including its inline scripts and worker', async ({
    page,
    context,
  }) => {
    const csp = productionCsp()
    await context.route('**/*', async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue()
      const response = await route.fetch()
      return route.fulfill({
        response,
        headers: { ...response.headers(), 'content-security-policy': csp },
      })
    })
    const violations: string[] = []
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        const w = window as unknown as { __csp: string[] }
        ;(w.__csp ??= []).push(`${e.violatedDirective} ${e.blockedURI}`)
      })
    })
    page.on('console', (m) => {
      if (m.type() === 'error') violations.push(`console: ${m.text()}`)
    })
    await onboard(page)
    await page.goto('/review')
    await answerCard(page)
    await page.goto('/kanji/%E6%97%A5')
    await page.getByRole('radio', { name: 'Trace' }).click()
    await expect(page.getByTestId('trace-surface')).toBeVisible()
    const inPage = await page.evaluate(
      () => (window as unknown as { __csp?: string[] }).__csp ?? [],
    )
    expect([...violations, ...inPage]).toEqual([])
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
  })

  test('installs a service worker, then finishes a session and reloads while offline', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName === 'webkit', 'WebKit in Playwright has no offline-mode service worker')
    await onboard(page)
    await page.waitForFunction(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      return Boolean(reg?.active)
    })
    // Reload once online so the page is controlled by the worker, then wait for that control.
    await page.reload()
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
    // Warm the runtime caches the session needs (packs, fonts) by starting one online.
    await page.goto('/review')
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
    await answerCard(page)
    await context.setOffline(true)
    await page.reload()
    await answerCard(page)
    // The grade is written to IndexedDB asynchronously; let it land before navigating away.
    await page.waitForTimeout(600)
    await page.goto('/')
    await expect(page.getByText(/Reviews today/i)).toBeVisible()
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible()
    await context.setOffline(false)
  })
})
