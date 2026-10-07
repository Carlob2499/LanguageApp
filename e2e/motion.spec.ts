import { expect, test, type Page } from '@playwright/test'

import { answerCard, ONBOARDED_SETTINGS } from './helpers'

/** Loads the app as a returning learner with a fresh visit (nothing in sessionStorage). */
async function visit(page: Page, extra: Record<string, unknown> = {}) {
  await page.addInitScript((s) => localStorage.setItem('kintsugi.settings', JSON.stringify(s)), {
    ...ONBOARDED_SETTINGS,
    ...extra,
  })
  await page.goto('/')
}

const opening = (page: Page) => page.locator('[data-opening]')

test.describe('motion', () => {
  test('the opening plays once per visit and then clears', async ({ page }) => {
    await visit(page)
    await expect(opening(page)).toBeVisible()
    await expect(opening(page)).toHaveCount(0, { timeout: 6000 })
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(opening(page)).toHaveCount(0)
  })

  test('any key skips the opening', async ({ page }) => {
    await visit(page)
    await expect(opening(page)).toBeVisible()
    await page.keyboard.press('Space')
    await expect(opening(page)).toHaveCount(0, { timeout: 1500 })
  })

  test('reduced motion skips the opening and the effects canvas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await visit(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(opening(page)).toHaveCount(0)
    await page.waitForTimeout(1500)
    await expect(page.locator('canvas[class*="stage"]')).toHaveCount(0)
  })

  test('first run never plays the opening', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/welcome$/)
    await expect(opening(page)).toHaveCount(0)
  })

  test('Sound and Motion are settings that stay on this device', async ({ page }) => {
    await visit(page)
    await page.keyboard.press('Space')
    await page.goto('/settings')
    await expect(page.getByText('Sound', { exact: true })).toBeVisible()
    await expect(page.getByText('Motion', { exact: true })).toBeVisible()
    await page.getByRole('radio', { name: 'Gentle' }).click()
    const stored = await page.evaluate(() => localStorage.getItem('kintsugi.settings'))
    expect(JSON.parse(stored ?? '{}')).toMatchObject({ motion: 'gentle', sound: true })
  })

  test('a run of right answers plays seals and a combo with a clean console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await visit(page)
    await page.keyboard.press('Space')
    await page.goto('/review')
    for (let i = 0; i < 4; i++) {
      await answerCard(page, 'Good')
    }
    await expect(page.locator('canvas[class*="stage"]')).toHaveCount(1)
    expect(errors).toEqual([])
  })
})
