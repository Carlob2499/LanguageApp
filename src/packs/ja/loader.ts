import type { PackIndex } from '@/packs/schema'

import type { KanjiItem, Level, VocabItem } from './types'

/**
 * Packs are validated with zod when they are built (scripts/data/build.ts) and hash-checked by
 * data:verify, so the app only sanity-checks the envelope and keeps zod out of the client bundle.
 */
function items<T>(data: unknown, path: string): T[] {
  if (
    typeof data !== 'object' ||
    data === null ||
    !Array.isArray((data as { items?: unknown }).items)
  ) {
    throw new Error(`${path} is not a content pack`)
  }
  return (data as { items: T[] }).items
}

const cache = new Map<string, Promise<unknown>>()

async function fetchJson<T>(path: string, parse: (data: unknown) => T): Promise<T> {
  const existing = cache.get(path) as Promise<T> | undefined
  if (existing) return existing
  const promise = (async () => {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`)
    return parse(await res.json())
  })()
  cache.set(path, promise)
  promise.catch(() => cache.delete(path))
  return promise
}

export function loadIndex(): Promise<PackIndex> {
  return fetchJson('/packs/ja/index.json', (d) => d as PackIndex)
}

export function loadKanji(level: Level): Promise<KanjiItem[]> {
  return fetchJson(`/packs/ja/kanji-${level}.json`, (d) => items<KanjiItem>(d, `kanji-${level}`))
}

export function loadVocab(level: Level): Promise<VocabItem[]> {
  return fetchJson(`/packs/ja/vocab-${level}.json`, (d) => items<VocabItem>(d, `vocab-${level}`))
}

/** Resolves an item id (`k:駅` or `v:1234`) within a level's packs. */
export async function loadLevelItems(
  level: Level,
): Promise<{ kanji: Map<string, KanjiItem>; vocab: Map<string, VocabItem> }> {
  const [kanji, vocab] = await Promise.all([loadKanji(level), loadVocab(level)])
  return {
    kanji: new Map(kanji.map((k) => [k.id, k])),
    vocab: new Map(vocab.map((v) => [v.id, v])),
  }
}
