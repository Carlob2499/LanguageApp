import { readFileSync } from 'node:fs'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { flattenPath, resample } from '../src/engine/stroke-path'

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

async function openKanji(page: Page, char: string) {
  await page.goto('/')
  await page.evaluate((s) => localStorage.setItem('kintsugi.settings', JSON.stringify(s)), SETTINGS)
  await page.goto(`/kanji/${encodeURIComponent(char)}`)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(char)
}

/** Sample points along each KanjiVG stroke of `char`, in box units, from the shipped pack. */
function strokePoints(char: string): number[][][] {
  const pack = JSON.parse(
    readFileSync(new URL('../public/packs/ja/strokes-N5.json', import.meta.url), 'utf8'),
  ) as { items: Array<{ char: string; strokes: Array<{ d: string }> }> }
  const item = pack.items.find((i) => i.char === char)
  if (!item) throw new Error(`${char} is not in the N5 strokes pack`)
  return item.strokes.map((s) => resample(flattenPath(s.d), 16).map(([x, y]) => [x, y]))
}

test.describe('kanji study', () => {
  test('tracing: a backwards stroke is refused, then every stroke traced in order completes', async ({
    page,
  }) => {
    await openKanji(page, '日')
    await page.getByRole('radio', { name: 'Trace' }).click()
    const surface = page.getByTestId('trace-surface')
    await surface.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    const box = (await surface.boundingBox())!
    const strokes = strokePoints('日')
    const toPage = ([x, y]: number[]) =>
      [box.x + (x! / 109) * box.width, box.y + (y! / 109) * box.height] as const
    const draw = async (points: number[][]) => {
      const pts = points.map(toPage)
      await page.mouse.move(pts[0]![0], pts[0]![1])
      await page.mouse.down()
      for (const p of pts.slice(1)) await page.mouse.move(p[0], p[1])
      await page.mouse.up()
    }
    await draw([...strokes[0]!].reverse())
    await expect(page.getByRole('status').first()).toHaveText('Right shape, wrong direction.')
    for (const stroke of strokes) await draw(stroke)
    await expect(page.getByRole('status').first()).toHaveText(/All 4 strokes traced in 5 tries/)
    await page.getByRole('button', { name: 'Trace again' }).click()
    await expect(page.getByRole('status').first()).toHaveText('Stroke 1 of 4')
  })

  test('assemble: the scene or its flat equivalent renders, and a part lists other kanji using it', async ({
    page,
  }) => {
    await openKanji(page, '時')
    await page.getByRole('radio', { name: 'Assemble' }).click()
    await expect(
      page.getByTestId('assembly-3d').or(page.getByTestId('assembly-flat')),
    ).toBeVisible()
    await page.getByRole('button', { name: /^寺/ }).first().click()
    await expect(page.getByText('also appears in')).toBeVisible()
    await expect(page.getByRole('link', { name: /^持/ })).toBeVisible()
  })

  test('assemble under reduced motion is the flat diagram', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openKanji(page, '時')
    await page.getByRole('radio', { name: 'Assemble' }).click()
    await expect(page.getByTestId('assembly-flat')).toBeVisible()
    await expect(page.getByTestId('assembly-3d')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Part 日' })).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([])
    await page.getByRole('radio', { name: 'Trace' }).click()
    const traced = await new AxeBuilder({ page }).analyze()
    expect(
      traced.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([])
  })

  test("a memory aid is the learner's own and survives a reload", async ({ page }) => {
    await openKanji(page, '日')
    const field = page.getByLabel(/Memory aid/)
    await expect(field).toHaveValue('')
    await field.fill('A window with the sun behind it.')
    await page.getByRole('heading', { level: 1 }).click()
    await expect(page.getByText('Saved on this device.')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel(/Memory aid/)).toHaveValue('A window with the sun behind it.')
  })
})
