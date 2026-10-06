import type { KanjiItem, VocabItem } from './types'

/** Card types the Japanese profile generates. The engine treats these as opaque strings. */
export const JA_CARD_TYPES = {
  kanjiMeaning: 'kanji-meaning',
  vocabMeaning: 'vocab-meaning',
  vocabReading: 'vocab-reading',
} as const
export type JaCardType = (typeof JA_CARD_TYPES)[keyof typeof JA_CARD_TYPES]

/** The spelling shown for a word: the first common kanji form, else the first form, else the reading. */
export function displayForm(item: VocabItem): string {
  return item.forms.find((f) => f.common)?.text ?? item.forms[0]?.text ?? item.readings[0]!.text
}

/** Readings that apply to the displayed form (respecting JMdict re_restr). */
export function readingsFor(item: VocabItem, form: string): string[] {
  const applicable = item.readings.filter((r) => !r.restrictTo || r.restrictTo.includes(form))
  return (applicable.length > 0 ? applicable : item.readings).map((r) => r.text)
}

export function primaryGloss(item: VocabItem): string {
  return item.senses[0]!.gloss.slice(0, 3).join('; ')
}

/** Which cards an item gets. Kana-only words have no reading card. */
export function cardTypesFor(kind: 'kanji' | 'vocab', item: KanjiItem | VocabItem): JaCardType[] {
  if (kind === 'kanji') return [JA_CARD_TYPES.kanjiMeaning]
  const vocab = item as VocabItem
  return vocab.forms.length > 0 && vocab.kanji.length > 0
    ? [JA_CARD_TYPES.vocabMeaning, JA_CARD_TYPES.vocabReading]
    : [JA_CARD_TYPES.vocabMeaning]
}
