import { expect, type Page } from '@playwright/test'

/** Settings mirror for a learner who finished onboarding at N5 with kana known. */
export const ONBOARDED_SETTINGS = {
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

export async function skipOnboarding(page: Page) {
  await page.goto('/')
  await page.evaluate(
    (s) => localStorage.setItem('kintsugi.settings', JSON.stringify(s)),
    ONBOARDED_SETTINGS,
  )
}

/** Walks the real welcome flow: reads kana, picks N5 by hand, 10 new cards a day. */
export async function onboard(page: Page) {
  await page.goto('/')
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('radio', { name: /^漢/ }).click()
  await page.getByRole('button', { name: 'Pick a level myself' }).click()
  await page.getByRole('radio', { name: /^N5/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('radio', { name: /^10/ }).click()
  await page.getByRole('button', { name: 'Begin' }).click()
  await expect(page).toHaveURL(/\/$/)
}

/** Answers the current card: reveal + grade for meaning cards, type + check for reading cards. */
export async function answerCard(page: Page, grade: 'Good' | 'Again' = 'Good') {
  const reveal = page.getByRole('button', { name: 'Reveal' })
  const check = page.getByRole('button', { name: 'Check' })
  await expect(reveal.or(check)).toBeVisible()
  if (await reveal.isVisible()) {
    await reveal.click()
    await page.getByRole('button', { name: new RegExp(`^${grade}`) }).click()
  } else {
    await page.getByLabel('Type the reading in kana or romaji').fill('xx')
    await check.click()
    await page.getByRole('button', { name: new RegExp(`^${grade}`) }).click()
  }
}
