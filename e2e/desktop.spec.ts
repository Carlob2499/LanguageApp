import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const SETTINGS = {
  onboarded: true,
  level: 'N5',
  newPerDay: 10,
  maxReviews: 200,
  backlogGate: true,
  desiredRetention: 0.9,
  theme: 'auto',
  jaTextScale: 1,
  kanaReady: true,
}

async function onboarded(page: Page, path: string) {
  await page.goto('/')
  await page.evaluate((s) => localStorage.setItem('kintsugi.settings', JSON.stringify(s)), SETTINGS)
  await page.goto(path)
  // The entry module loads after the first paint, so wait for the live app before pressing keys.
  await expect(page.getByRole('button', { name: /Search/ })).toBeVisible()
}

async function noSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([])
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard-first features are for wide screens')

  test('command palette: Ctrl+K, search a kanji, Enter opens it; ? shows shortcuts', async ({
    page,
  }) => {
    await onboarded(page, '/')
    await page.keyboard.press('Control+k')
    const dialog = page.getByRole('dialog', { name: 'Command palette' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('option', { name: /Start a session/ })).toBeVisible()
    await noSeriousViolations(page)
    await page.keyboard.type('時')
    const hit = dialog.getByRole('option').first()
    await expect(hit).toContainText('時')
    await expect(hit).toHaveAttribute('aria-selected', 'true')
    // Words using it follow the kanji itself.
    await expect(dialog.getByRole('option', { name: /^時間/ })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/kanji\/%E6%99%82$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('時')
    await page.keyboard.press('?')
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
    await expect(page.getByText('Again · Hard · Good · Easy')).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('palette commands navigate and switch the theme', async ({ page }) => {
    await onboarded(page, '/')
    await page.getByRole('button', { name: /Search/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Command palette' })
    await expect(dialog).toBeVisible()
    await page.keyboard.type('theme')
    await expect(dialog.getByRole('option', { name: /Switch theme/ })).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.keyboard.press('Control+k')
    await expect(dialog).toBeVisible()
    await page.keyboard.type('progress')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/progress$/)
  })

  test('library split view: / searches, J/K move, the pane follows, Enter opens, T traces', async ({
    page,
  }) => {
    await onboarded(page, '/library')
    await expect(page.getByTestId('library-pane')).toBeVisible()
    const first = page.getByRole('link', { name: /^日/ }).first()
    await expect(page.getByRole('list').first().getByRole('link').first()).toBeVisible()
    await page.keyboard.press('/')
    await expect(page.getByRole('searchbox')).toBeFocused()
    await page.keyboard.type('day')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('searchbox')).not.toBeFocused()
    await expect(first).toBeVisible()
    // The pane shows the item under the cursor, and J moves it.
    const pane = page.getByTestId('library-pane')
    await expect(pane.getByRole('heading', { level: 1 })).toContainText('日')
    await page.keyboard.press('j')
    const second = await page.locator('[data-cursor="true"] [lang="ja"]').first().textContent()
    expect(second).not.toBe('日')
    await expect(pane.getByRole('heading', { level: 1 })).toContainText(second!)
    await page.keyboard.press('k')
    await expect(pane.getByRole('heading', { level: 1 })).toContainText('日')
    await noSeriousViolations(page)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/kanji\/%E6%97%A5$/)
    // The kanji route is a lazy chunk, and the library's embedded copy of the kanji view stays
    // on screen until it arrives; press mode keys only once the route's own instance is up.
    await expect(page.locator('article[data-embedded]')).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'Strokes' })).toBeChecked()
    await page.keyboard.press('t')
    await expect(page.getByRole('radio', { name: 'Trace' })).toBeChecked()
    await page.keyboard.press('a')
    await expect(page.getByRole('radio', { name: 'Assemble' })).toBeChecked()
    await page.keyboard.press('s')
    await expect(page.getByRole('radio', { name: 'Strokes' })).toBeChecked()
  })
})
