import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import { answerCard, skipOnboarding } from './helpers'

/**
 * Device-to-device sync against an in-memory stand-in for /api/sync with the real GET / PUT /
 * If-Match semantics. The payload must be opaque: no card ids, no readings, nothing readable.
 */
class FakeBlobStore {
  bytes = new Map<string, Buffer>()
  auth = new Map<string, string>()
  puts = 0
  version(id: string): number {
    const b = this.bytes.get(id)
    return b ? b.readUInt32BE(0) : 0
  }
  async install(context: BrowserContext) {
    await context.route(/\/api\/sync$/, async (route) => {
      const h = route.request().headers()
      const id = h['x-sync-id'] ?? ''
      if (route.request().url().includes('?')) return route.fulfill({ status: 400 })
      if (!/^[0-9a-f]{32}$/.test(id))
        return route.fulfill({ status: 400, body: '{"error":"bad-id"}' })
      if (route.request().method() === 'GET') {
        const b = this.bytes.get(id)
        if (!b) return route.fulfill({ status: 404, body: '{"error":"none"}' })
        return route.fulfill({
          status: 200,
          body: b,
          headers: {
            'content-type': 'application/octet-stream',
            'x-sync-version': String(this.version(id)),
          },
        })
      }
      if (route.request().method() === 'PUT') {
        const token = h['x-sync-auth'] ?? ''
        if (!/^[0-9a-f]{64}$/.test(token)) return route.fulfill({ status: 403 })
        const stored = this.auth.get(id)
        if (stored && stored !== token) return route.fulfill({ status: 403 })
        const body = route.request().postDataBuffer()!
        const expected = Number.parseInt(h['if-match'] ?? '0', 10)
        const current = this.version(id)
        if (current !== expected || body.readUInt32BE(0) !== current + 1) {
          return route.fulfill({ status: 409, body: JSON.stringify({ version: current }) })
        }
        this.auth.set(id, token)
        this.bytes.set(id, body)
        this.puts++
        return route.fulfill({ status: 204 })
      }
      return route.fulfill({ status: 405 })
    })
  }
}

async function reviewSome(page: Page, n: number) {
  await page.goto('/review')
  for (let i = 0; i < n; i++) await answerCard(page)
}

async function cardCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open('kintsugi')
        req.onerror = () => reject(new Error(String(req.error)))
        req.onsuccess = () => {
          const db = req.result
          const count = db.transaction('cards').objectStore('cards').count()
          count.onsuccess = () => {
            db.close()
            resolve(count.result)
          }
          count.onerror = () => reject(new Error(String(count.error)))
        }
      }),
  )
}

test.describe('sync', () => {
  test("two devices share one encrypted snapshot and merge each other's reviews", async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(90_000)
    const store = new FakeBlobStore()
    const a = await browser.newContext({ baseURL: baseURL! })
    await store.install(a)
    const pageA = await a.newPage()
    await skipOnboarding(pageA)
    await reviewSome(pageA, 3)
    const cardsOnA = await cardCount(pageA)
    expect(cardsOnA).toBeGreaterThan(0)
    await pageA.goto('/settings')
    await pageA.getByRole('button', { name: 'Turn on sync' }).click()
    const key = (await pageA.getByTestId('sync-key').textContent())!.trim()
    expect(key.replace(/-/g, '')).toHaveLength(26)
    await expect(pageA.getByRole('status').filter({ hasText: /Synced/ })).toBeVisible()
    expect(store.puts).toBe(1)
    const [id, blob] = [...store.bytes.entries()][0]!
    expect(id).toMatch(/^[0-9a-f]{32}$/)
    const text = blob.toString('latin1')
    expect(text).not.toContain('cards')
    expect(text).not.toContain('kanji-meaning')
    expect(text).not.toContain('"itemId"')

    // Device B joins with the key: pulls A's progress, then adds its own.
    const b = await browser.newContext({ baseURL: baseURL! })
    await store.install(b)
    const pageB = await b.newPage()
    await skipOnboarding(pageB)
    await pageB.goto(`/settings#sync=${encodeURIComponent(key)}`)
    await expect(pageB.getByLabel('Key from the other device')).toHaveValue(key)
    await pageB.getByRole('button', { name: 'Join' }).click()
    await expect(pageB.getByRole('status').filter({ hasText: /Synced/ })).toBeVisible()
    expect(await cardCount(pageB)).toBe(cardsOnA)
    expect(store.puts).toBe(2)
    await reviewSome(pageB, 2)
    await pageB.goto('/settings')
    await pageB.getByRole('button', { name: 'Sync now' }).click()
    await expect(pageB.getByRole('status').filter({ hasText: /snapshot 3/ })).toBeVisible()

    // A merges B's reviews on its next sync, and nothing is lost either way.
    await pageA.getByRole('button', { name: 'Sync now' }).click()
    await expect(pageA.getByRole('status').filter({ hasText: /snapshot 4/ })).toBeVisible()
    expect(await cardCount(pageA)).toBe(await cardCount(pageB))
    expect(store.puts).toBe(4)
    await a.close()
    await b.close()
  })

  test('a deployment without a Blob store says so instead of failing silently', async ({
    page,
    context,
  }) => {
    await context.route(/\/api\/sync$/, (route) =>
      route.fulfill({ status: 503, body: '{"error":"unconfigured"}' }),
    )
    await skipOnboarding(page)
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Turn on sync' }).click()
    await expect(page.getByRole('status').filter({ hasText: /not switched on/ })).toBeVisible()
  })
})
