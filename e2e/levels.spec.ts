import { expect, test } from '@playwright/test'

import { ONBOARDED_SETTINGS } from './helpers'

test('a due card from an earlier level still shows after moving up a level', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(
    (s) => localStorage.setItem('kintsugi.settings', JSON.stringify({ ...s, level: 'N4' })),
    ONBOARDED_SETTINGS,
  )
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const now = Date.now()
  await page.evaluate(
    (card) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('kintsugi')
        req.onerror = () => reject(new Error(String(req.error)))
        req.onsuccess = () => {
          const tx = req.result.transaction('cards', 'readwrite')
          tx.objectStore('cards').put(card)
          tx.oncomplete = () => {
            req.result.close()
            resolve()
          }
        }
      }),
    {
      key: 'k:日|kanji-meaning',
      itemId: 'k:日',
      cardType: 'kanji-meaning',
      group: 'N5',
      state: 'review',
      due: now - 60_000,
      stability: 4,
      difficulty: 5,
      elapsedDays: 4,
      scheduledDays: 4,
      learningSteps: 0,
      reps: 3,
      lapses: 0,
      lastReview: now - 4 * 86_400_000,
      introducedAt: now - 10 * 86_400_000,
    },
  )
  await page.goto('/review')
  // Due reviews come first: the N5 kanji, not "missing from the pack".
  await expect(page.getByText('Kanji · meaning')).toBeVisible()
  await expect(page.locator('p[lang="ja"]', { hasText: /^日$/ })).toBeVisible()
  await expect(page.getByText("This card's word is missing")).toHaveCount(0)
})
