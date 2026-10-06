import { expect, test } from '@playwright/test'

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
    await expect(
      page.getByRole('heading', { level: 1, name: 'Do you know this word?' }),
    ).toBeVisible()
    // A learner who knows nothing stops after one block of six.
    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: /Don't know/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: /Start around N5/ })).toBeVisible()
    await page.getByRole('button', { name: /^Begin at N5/ }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText('Today · N5')).toBeVisible()
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
  })
})
