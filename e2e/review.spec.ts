import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function onboard(page: Page) {
  await page.goto('/')
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('radio', { name: /^N5/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('radio', { name: /^10/ }).click()
  await page.getByRole('button', { name: 'Begin' }).click()
  await expect(page).toHaveURL(/\/$/)
}

/** Answers the current card: reveal + grade for meaning cards, type + check for reading cards. */
async function answerCard(page: Page, grade: 'Good' | 'Again' = 'Good') {
  const reveal = page.getByRole('button', { name: 'Reveal' })
  const check = page.getByRole('button', { name: 'Check' })
  await expect(reveal.or(check)).toBeVisible()
  if (await reveal.isVisible()) {
    await reveal.click()
    await page.getByRole('button', { name: new RegExp(`^${grade}`) }).click()
  } else {
    // Reading card: a wrong answer auto-grades Again, so type nonsense for Again and the
    // first accepted reading is unknown here; use the grade buttons after the auto-reveal.
    await page.getByLabel('Type the reading in kana or romaji').fill('xx')
    await check.click()
    await page.getByRole('button', { name: new RegExp(`^${grade}`) }).click()
  }
}

test.describe('onboarding and first review session', () => {
  test('onboards, reviews cards, persists progress across reload, and supports undo', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(e.message))

    await onboard(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Meet something new')
    await page.getByRole('link', { name: 'Learn new cards' }).click()
    await expect(page).toHaveURL(/\/review$/)

    const progress = page.getByRole('progressbar', { name: 'Session progress' })
    await expect(progress).toHaveAttribute('aria-valuenow', '0')

    await answerCard(page, 'Good')
    await expect(progress).toHaveAttribute('aria-valuenow', '1')

    // Undo returns to the previous card with the answer shown.
    await page.getByRole('button', { name: 'Undo last grade' }).click()
    await expect(progress).toHaveAttribute('aria-valuenow', '0')
    await expect(page.getByRole('group', { name: 'Grade this card' })).toBeVisible()
    await page.getByRole('button', { name: /^Good/ }).click()
    await expect(progress).toHaveAttribute('aria-valuenow', '1')

    for (let i = 0; i < 4; i++) await answerCard(page, i % 2 === 0 ? 'Good' : 'Again')
    await expect(progress).toHaveAttribute('aria-valuenow', '5')

    const axe = await new AxeBuilder({ page }).analyze()
    expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
      [],
    )

    // Reload mid-session: the session resumes where it was.
    await page.reload()
    await expect(page).toHaveURL(/\/review$/)
    await expect(progress).toHaveAttribute('aria-valuenow', '5')

    // Progress is in IndexedDB: the Today screen reflects it after a fresh navigation.
    await page.goto('/')
    await expect(
      page.getByText('Reviews today').locator('..').getByRole('definition'),
    ).toContainText(/[5-9]|\d{2}/)
    expect(errors).toEqual([])
  })

  test('keyboard-only: space reveals, digits grade, u undoes', async ({ page }) => {
    await onboard(page)
    await page.getByRole('link', { name: 'Learn new cards' }).focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/review$/)
    const progress = page.getByRole('progressbar', { name: 'Session progress' })
    const reveal = page.getByRole('button', { name: 'Reveal' })
    const check = page.getByRole('button', { name: 'Check' })
    await expect(reveal.or(check)).toBeVisible()
    if (await check.isVisible()) {
      await page.keyboard.type('xx')
      await page.keyboard.press('Enter')
    } else {
      await page.keyboard.press('Space')
    }
    await expect(page.getByRole('group', { name: 'Grade this card' })).toBeVisible()
    await page.getByRole('main').focus()
    await page.keyboard.press('3')
    await expect(progress).toHaveAttribute('aria-valuenow', '1')
    await page.keyboard.press('u')
    await expect(progress).toHaveAttribute('aria-valuenow', '0')
  })
})
