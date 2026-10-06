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
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await page.getByRole('link', { name: 'Sources' }).click()
    await expect(page).toHaveURL(/\/about$/)
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
})
