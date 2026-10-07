import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

import { displayForm, primaryGloss, readingsFor } from '../src/packs/ja/cards'
import type { VocabItem } from '../src/packs/ja/types'

test.describe('beginner and placement paths', () => {
  test('kana first: sessions teach kana with choices and the kana table shows progress', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByRole('radio', { name: /^あ/ }).click()
    await page.getByRole('button', { name: 'Begin with kana' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Kana first')).toBeVisible()

    await page.getByRole('link', { name: 'Learn new cards' }).click()
    const group = page.getByRole('group', { name: 'Kana · sound' })
    await expect(group).toBeVisible()
    // Answer three kana cards by picking the first option; the card advances on its own.
    for (let i = 0; i < 3; i++) {
      await page.getByRole('group', { name: 'Kana · sound' }).getByRole('button').first().click()
      await expect(page.getByRole('progressbar', { name: 'Session progress' })).toHaveAttribute(
        'aria-valuenow',
        String(i + 1),
        { timeout: 10_000 },
      )
    }
    await page.goto('/kana')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Start with the sounds.' }),
    ).toBeVisible()
    await expect(page.getByText(/of \d+ met so far/)).toBeVisible()
    await page.getByRole('button', { name: 'Take the kana check' }).click()
    await expect(page.getByRole('group', { name: 'Which sound is this?' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('placement test ends with a level estimate and starts the app there', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByRole('radio', { name: /^漢/ }).click()
    await page.getByRole('button', { name: 'Take the placement test' }).click()
    await expect(page).toHaveURL(/\/placement$/)
    const question = page.getByRole('heading', {
      level: 1,
      name: /What does this word mean\?|How is this word read\?/,
    })
    await expect(question).toBeVisible()
    // A learner who is never sure is placed at N5 after the minimum number of questions.
    let answered = 0
    while (answered < 20 && !(await page.getByText(/Start around/).isVisible())) {
      await page.getByRole('button', { name: /^Not sure/ }).click()
      answered++
      await page.waitForTimeout(450)
    }
    expect(answered).toBeGreaterThanOrEqual(10)
    expect(answered).toBeLessThanOrEqual(20)
    await expect(page.getByRole('heading', { level: 1, name: /Start around N5/ })).toBeVisible()
    await page.getByRole('button', { name: /^Begin at N5/ }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Today · N5')).toBeVisible()
  })

  test('a learner who knows every word is placed at the top in at most 20 questions', async ({
    page,
  }) => {
    // Right answers per written form, straight from the packs the questions are built from.
    const right = new Map<string, Set<string>>()
    for (const level of ['N5', 'N4', 'N3', 'N2', 'N1']) {
      const pack = JSON.parse(readFileSync(`public/packs/ja/vocab-${level}.json`, 'utf8')) as {
        items: VocabItem[]
      }
      for (const word of pack.items) {
        const form = displayForm(word)
        const set = right.get(form) ?? new Set<string>()
        set.add(primaryGloss(word))
        for (const r of readingsFor(word, form)) set.add(r)
        right.set(form, set)
      }
    }
    await page.goto('/placement')
    const group = page.getByRole('group', { name: 'Choose an answer' })
    let answered = 0
    while (answered < 20 && !(await page.getByText(/Start around/).isVisible())) {
      await expect(group.getByRole('button').first()).toBeEnabled()
      const form = (await page.locator('p[lang="ja"]').first().innerText()).trim()
      const texts = await group.getByRole('button').locator('span').allInnerTexts()
      const accepted = right.get(form)
      const index = texts.findIndex((t) => accepted?.has(t.trim()))
      expect(index, `no right option found for ${form}`).toBeGreaterThanOrEqual(0)
      await group.getByRole('button').nth(index).click()
      answered++
      await page.waitForTimeout(450)
    }
    expect(answered).toBeLessThanOrEqual(20)
    await expect(page.getByRole('heading', { level: 1, name: /Start around N1/ })).toBeVisible()
  })

  test('placement questions are checked, keyboard-answerable and sized for the screen', async ({
    page,
  }) => {
    await page.goto('/placement')
    const word = page.locator('p[lang="ja"]').first()
    await expect(word).toBeVisible()
    const width = page.viewportSize()!.width
    const size = await word.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    // Phones get a large word; desktops a larger one (the test used to sit small on a wide screen).
    expect(size).toBeGreaterThanOrEqual(width >= 900 ? 100 : 56)
    const options = page.getByRole('group', { name: 'Choose an answer' }).getByRole('button')
    await expect(options).toHaveCount(4)
    await page.keyboard.press('1')
    await expect(page.getByRole('progressbar', { name: 'Placement progress' })).toHaveAttribute(
      'aria-valuenow',
      '1',
    )
  })

  test('settings can save a backup file', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Start' }).click()
    await page.getByRole('radio', { name: /^漢/ }).click()
    await page.getByRole('button', { name: 'Pick a level myself' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Begin' }).click()
    await page.goto('/settings')
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Save a backup' }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/^kintsugi-progress-\d{4}-\d{2}-\d{2}\.json$/)
    await expect(page.getByRole('status')).toContainText('Backup downloaded')
    const saved = await file.path()
    const text = readFileSync(saved, 'utf8')
    expect(text).toContain('"formatName":"dexie"')

    // A damaged file is refused before anything is cleared.
    await page.getByLabel('Choose a backup file').setInputFiles({
      name: 'broken.json',
      mimeType: 'application/json',
      buffer: Buffer.from(text.slice(0, Math.floor(text.length / 2))),
    })
    await page.getByRole('button', { name: 'Replace' }).click()
    await expect(page.getByRole('status')).toContainText('damaged or not a Kintsugi backup')

    // The real file restores.
    await page.getByLabel('Choose a backup file').setInputFiles(saved)
    await page.getByRole('button', { name: 'Replace' }).click()
    await expect(page.getByRole('status')).toContainText('Restored')
  })
})
