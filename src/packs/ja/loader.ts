import type { PackIndex } from '@/packs/schema'

import type {
  ConfusableItem,
  KanaItem,
  KanjiItem,
  Level,
  SentenceItem,
  StrokeItem,
  VocabItem,
} from './types'
import { LEVELS } from './levels'

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

export function loadStrokes(level: Level | 'kana'): Promise<StrokeItem[]> {
  return fetchJson(`/packs/ja/strokes-${level}.json`, (d) =>
    items<StrokeItem>(d, `strokes-${level}`),
  )
}

export function loadSentences(level: Level): Promise<SentenceItem[]> {
  return fetchJson(`/packs/ja/sentences-${level}.json`, (d) =>
    items<SentenceItem>(d, `sentences-${level}`),
  )
}

const strokeIndex = new Map<string, Promise<Map<string, StrokeItem>>>()

/** Stroke data for one character, from its level's pack (or the kana pack). */
export async function strokesFor(
  char: string,
  level: Level | 'kana',
): Promise<StrokeItem | undefined> {
  let index = strokeIndex.get(level)
  if (!index) {
    index = loadStrokes(level).then((list) => new Map(list.map((s) => [s.char, s])))
    strokeIndex.set(level, index)
  }
  return (await index).get(char)
}

/** Sentences for one word, from its level's pack. */
export async function sentencesFor(wordId: string, level: Level): Promise<SentenceItem[]> {
  const all = await loadSentences(level)
  return all.filter((s) => s.word === wordId)
}

export function loadKana(): Promise<KanaItem[]> {
  return fetchJson('/packs/ja/kana.json', (d) => items<KanaItem>(d, 'kana'))
}

export function loadConfusables(): Promise<ConfusableItem[]> {
  return fetchJson('/packs/ja/confusables.json', (d) => items<ConfusableItem>(d, 'confusables'))
}

export function loadPlacementLures(): Promise<Array<{ text: string; mora: number }>> {
  return fetchJson('/packs/ja/placement.json', (d) =>
    items<{ text: string; mora: number }>(d, 'placement'),
  )
}

/** Finds a kanji in any level's pack (packs are small and cached). */
export async function findKanji(
  char: string,
): Promise<{ kanji: KanjiItem; level: Level } | undefined> {
  for (const level of LEVELS) {
    const kanji = (await loadKanji(level)).find((k) => k.char === char)
    if (kanji) return { kanji, level }
  }
  return undefined
}
