import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('app shell', () => {
  test('loads, navigates, and has no console errors or serious axe violations', async ({
    page,
  }) => {
    const consoleErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning')
        consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    await page.goto('/')
    await expect(page).toHaveTitle('Kintsugi')
    // A fresh install lands on the welcome flow.
    await expect(page).toHaveURL(/\/welcome$/)
    await expect(
      page.getByRole('heading', { level: 1, name: /one short session a day/ }),
    ).toBeVisible()

    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1, name: 'Sources' })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('serves the web app manifest and a service worker script', async ({ request }) => {
    const manifest = await request.get('/manifest.webmanifest')
    expect(manifest.ok()).toBe(true)
    const json = (await manifest.json()) as { name: string; display: string; icons: unknown[] }
    expect(json.name).toBe('Kintsugi')
    expect(json.display).toBe('standalone')
    expect(json.icons.length).toBeGreaterThanOrEqual(2)

    const sw = await request.get('/sw.js')
    expect(sw.ok()).toBe(true)
    expect(sw.headers()['content-type']).toContain('javascript')
  })

  test('the first screen is in the HTML before any script, and hidden for returning learners', async ({
    page,
    request,
  }) => {
    const html = await (await request.get('/')).text()
    expect(html).toContain('Learn Japanese, one short session a day.')
    expect(html).toContain('data-prerender')
    // No module script tag for the preload scanner: the loader adds it after the first paint.
    expect(html).not.toMatch(/<script type="module"[^>]*src=/)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Learn Japanese, one short session a day.',
    )
    await expect(page.locator('[data-prerender]')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveAttribute('data-returning', '')
    await page.evaluate(() =>
      localStorage.setItem(
        'kintsugi.settings',
        JSON.stringify({ onboarded: true, level: 'N5', kanaReady: true, theme: 'light' }),
      ),
    )
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-returning', '')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(
      'Learn Japanese, one short session a day.',
    )
  })
})
