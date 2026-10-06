import { Scheduler } from '@/engine/scheduler'
import type { StudyCard } from '@/engine/types'
import { cardTypesFor } from '@/packs/ja/cards'
import { loadLevelItems } from '@/packs/ja/loader'
import type { KanjiItem, Level, VocabItem } from '@/packs/ja/types'

export interface LevelLibrary {
  level: Level
  kanji: Map<string, KanjiItem>
  vocab: Map<string, VocabItem>
  /** Every card the level can produce, in introduction order. */
  candidates: StudyCard[]
}

/**
 * Introduction order for a level: the most frequent kanji and the most common words,
 * alternating so a session mixes both. Words that use a level kanji follow that kanji.
 */
export async function loadLibrary(level: Level, now: number): Promise<LevelLibrary> {
  const { kanji, vocab } = await loadLevelItems(level)
  const scheduler = new Scheduler()
  const kanjiOrder = [...kanji.values()]
  const vocabOrder = [...vocab.values()]
  const candidates: StudyCard[] = []
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
  return { level, kanji, vocab, candidates }
}
