import { db } from '@/db'
import { Scheduler } from '@/engine/scheduler'
import type { StudyCard } from '@/engine/types'
import { cardTypesFor, DERIVED_STABILITY_DAYS, JA_CARD_TYPES } from '@/packs/ja/cards'
import type { Level } from '@/packs/ja/levels'
import { loadConfusables, loadKana, loadLevelItems, loadSentences } from '@/packs/ja/loader'
import type { ConfusableItem, KanaItem, KanjiItem, SentenceItem, VocabItem } from '@/packs/ja/types'

export interface LevelLibrary {
  level: Level
  kanji: Map<string, KanjiItem>
  vocab: Map<string, VocabItem>
  kana: Map<string, KanaItem>
  sentences: Map<string, SentenceItem[]>
  confusables: Map<string, ConfusableItem[]>
  /** Every card the level can produce, in introduction order. */
  candidates: StudyCard[]
}

/** Kana lesson order: hiragana basic rows, then voiced, then katakana the same way. */
export const KANA_ROWS = ['', 'k', 's', 't', 'n', 'h', 'm', 'y', 'r', 'w'] as const

export function kanaLessonOrder(kana: KanaItem[]): KanaItem[] {
  // ん has no vowel and no row of its own; it closes the basic table after the w row.
  const basic = (script: KanaItem['script']) => {
    const plain = kana.filter((k) => k.script === script && !k.small && k.voicing === 'none')
    const rows = KANA_ROWS.flatMap((row) =>
      plain.filter(
        (k) => k.row === row && k.romaji !== 'n' && !['wi', 'we', 'vu'].includes(k.romaji),
      ),
    )
    return [...rows, ...plain.filter((k) => k.romaji === 'n')]
  }
  const voiced = (script: KanaItem['script']) =>
    kana.filter((k) => k.script === script && !k.small && k.voicing !== 'none')
  return [...basic('hiragana'), ...voiced('hiragana'), ...basic('katakana'), ...voiced('katakana')]
}

/**
 * Later-stage cards practise items the learner already knows, so they come early: one after
 * every two fresh cards, instead of waiting behind every untouched item of the level.
 */
export function weaveDerived<T>(fresh: T[], derived: T[], every = 2): T[] {
  const out: T[] = []
  let d = 0
  fresh.forEach((card, i) => {
    out.push(card)
    if ((i + 1) % every === 0 && d < derived.length) out.push(derived[d++]!)
  })
  while (d < derived.length) out.push(derived[d++]!)
  return out
}

/**
 * Introduction order for a level: the most frequent kanji and the most common words,
 * alternating so a session mixes both. Words that use a level kanji follow that kanji.
 * Kana come first for learners who don't read them yet. Later-stage cards (contrast, cloze)
 * are generated for items whose base card is already stable.
 */
export async function loadLibrary(
  level: Level,
  now: number,
  options: { kanaReady: boolean },
): Promise<LevelLibrary> {
  const [{ kanji, vocab }, kanaList, sentenceList, confusableList, existing] = await Promise.all([
    loadLevelItems(level),
    loadKana(),
    loadSentences(level),
    loadConfusables(),
    db.cards.toArray(),
  ])
  const scheduler = new Scheduler()
  const kana = new Map(kanaList.map((k) => [k.id, k]))
  const sentences = new Map<string, SentenceItem[]>()
  for (const s of sentenceList) sentences.set(s.word, [...(sentences.get(s.word) ?? []), s])
  const confusables = new Map<string, ConfusableItem[]>()
  for (const c of confusableList) {
    confusables.set(`k:${c.a}`, [...(confusables.get(`k:${c.a}`) ?? []), c])
    confusables.set(`k:${c.b}`, [...(confusables.get(`k:${c.b}`) ?? []), c])
  }

  const candidates: StudyCard[] = []
  if (!options.kanaReady) {
    for (const k of kanaLessonOrder(kanaList))
      candidates.push(scheduler.newCard(k.id, JA_CARD_TYPES.kanaRecognition, 'kana', now))
  }

  const kanjiOrder = [...kanji.values()]
  const vocabOrder = [...vocab.values()]
  const max = Math.max(kanjiOrder.length, vocabOrder.length)
  const ratio = vocabOrder.length / Math.max(1, kanjiOrder.length)
  let v = 0
  for (let k = 0; k < max; k++) {
    const kanjiItem = kanjiOrder[k]
    if (kanjiItem) {
      for (const type of cardTypesFor('kanji', kanjiItem))
        candidates.push(scheduler.newCard(kanjiItem.id, type, level, now))
    }
    const take = kanjiItem ? Math.max(1, Math.round(ratio)) : vocabOrder.length
    for (let i = 0; i < take && v < vocabOrder.length; i++, v++) {
      const word = vocabOrder[v]!
      for (const type of cardTypesFor('vocab', word))
        candidates.push(scheduler.newCard(word.id, type, level, now))
    }
  }

  // Later-stage cards for items already settling into memory.
  const derived: StudyCard[] = []
  const existingKeys = new Set(existing.map((c) => c.key))
  for (const card of existing) {
    if (card.state !== 'review' || card.stability < DERIVED_STABILITY_DAYS) continue
    if (
      card.cardType === JA_CARD_TYPES.kanjiMeaning &&
      confusables.has(card.itemId) &&
      !existingKeys.has(`${card.itemId}|${JA_CARD_TYPES.kanjiContrast}`)
    ) {
      derived.push(scheduler.newCard(card.itemId, JA_CARD_TYPES.kanjiContrast, card.group, now))
      existingKeys.add(`${card.itemId}|${JA_CARD_TYPES.kanjiContrast}`)
    }
    const derive = (type: (typeof JA_CARD_TYPES)[keyof typeof JA_CARD_TYPES]) => {
      const key = `${card.itemId}|${type}`
      if (existingKeys.has(key)) return
      derived.push(scheduler.newCard(card.itemId, type, card.group, now))
      existingKeys.add(key)
    }
    if (card.cardType === JA_CARD_TYPES.kanjiMeaning && kanji.has(card.itemId))
      derive(JA_CARD_TYPES.kanjiWriting)
    if (card.cardType === JA_CARD_TYPES.vocabMeaning && vocab.has(card.itemId))
      derive(JA_CARD_TYPES.vocabListening)
    if (
      card.cardType === JA_CARD_TYPES.vocabMeaning &&
      sentences.has(card.itemId) &&
      !existingKeys.has(`${card.itemId}|${JA_CARD_TYPES.vocabCloze}`)
    ) {
      derived.push(scheduler.newCard(card.itemId, JA_CARD_TYPES.vocabCloze, card.group, now))
      existingKeys.add(`${card.itemId}|${JA_CARD_TYPES.vocabCloze}`)
    }
  }

  const ordered = weaveDerived(candidates, derived)

  return { level, kanji, vocab, kana, sentences, confusables, candidates: ordered }
}
