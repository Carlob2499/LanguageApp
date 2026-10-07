import { readFileSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'

import { flattenPath, resample } from '../src/engine/stroke-path'

import { answerCard, skipOnboarding } from './helpers'

/** A card the learner has known for weeks, not due for a month: its later-stage cards unlock. */
function settledCard(itemId: string, cardType: string) {
  const now = Date.now()
  return {
    key: `${itemId}|${cardType}`,
    itemId,
    cardType,
    group: 'N5',
    state: 'review',
    due: now + 30 * 86_400_000,
    stability: 30,
    difficulty: 5,
    elapsedDays: 10,
    scheduledDays: 30,
    learningSteps: 0,
    reps: 6,
    lapses: 0,
    lastReview: now - 10 * 86_400_000,
    introducedAt: now - 60 * 86_400_000,
  }
}

async function seed(page: Page, cards: unknown[]) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(
    (rows) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('kintsugi')
        req.onerror = () => reject(new Error(String(req.error)))
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('cards', 'readwrite')
          for (const row of rows) tx.objectStore('cards').put(row)
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(new Error(String(tx.error)))
        }
      }),
    cards,
  )
}

function strokesOf(char: string): Array<Array<readonly [number, number]>> {
  const pack = JSON.parse(readFileSync('public/packs/ja/strokes-N5.json', 'utf8')) as {
    items: Array<{ char: string; strokes: Array<{ d: string }> }>
  }
  return pack.items.find((i) => i.char === char)!.strokes.map((s) => resample(flattenPath(s.d), 16))
}

test('settled items unlock listening and write-from-memory cards, and both grade', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await skipOnboarding(page)
  await seed(page, [
    settledCard('k:日', 'kanji-meaning'),
    settledCard('v:1001820', 'vocab-meaning'),
  ])
  await page.goto('/review')

  const kind = page.locator('p', { hasText: /^(Writing · from memory|Listening · meaning)$/ })
  const seen = new Set<string>()
  for (let i = 0; i < 12 && seen.size < 2; i++) {
    await expect(
      page
        .getByRole('button', { name: 'Reveal' })
        .or(page.getByRole('button', { name: 'Check' }))
        .or(kind),
    ).toBeVisible()
    const label = (await kind.count()) > 0 ? await kind.first().textContent() : null
    if (label === 'Listening · meaning') {
      seen.add(label)
      // Headless Chromium has no Japanese voice, so the kana reading stands in.
      await expect(page.getByText('おかね', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: /^money/ }).click()
      await expect(page.getByText('Right.')).toBeVisible()
      await expect(kind).toHaveCount(0, { timeout: 5000 })
    } else if (label === 'Writing · from memory') {
      seen.add(label)
      await expect(page.getByText(/^day · sun/)).toBeVisible()
      const surface = page.getByTestId('trace-surface')
      await surface.scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
      const box = (await surface.boundingBox())!
      for (const stroke of strokesOf('日')) {
        const pts = stroke.map(
          ([x, y]) => [box.x + (x / 109) * box.width, box.y + (y / 109) * box.height] as const,
        )
        await page.mouse.move(pts[0]![0], pts[0]![1])
        await page.mouse.down()
        for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1])
        await page.mouse.up()
      }
      await expect(page.getByText('Written from memory.')).toBeVisible()
      await expect(kind).toHaveCount(0, { timeout: 5000 })
    } else {
      await answerCard(page)
    }
  }
  expect([...seen].sort()).toEqual(['Listening · meaning', 'Writing · from memory'])
})
