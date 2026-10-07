import { isKana, toHiragana, toKana, toRomaji } from 'wanakana'

/** Normalises a typed answer (romaji or kana) to hiragana with no spaces or punctuation. */
export function normaliseReading(input: string): string {
  const trimmed = input.trim().replace(/[\s\u3000.,!?\u3002\u3001\uff01\uff1f]/g, '')
  if (trimmed.length === 0) return ''
  return toHiragana(trimmed, { passRomaji: false })
}

export interface ReadingCheck {
  correct: boolean
  /** The accepted reading the answer matched, when correct. */
  matched?: string
}

/** A reading answer is right when it equals any accepted reading after normalisation. */
export function checkReading(answer: string, accepted: string[]): ReadingCheck {
  const given = normaliseReading(answer)
  if (given.length === 0) return { correct: false }
  for (const reading of accepted) {
    if (toHiragana(reading) === given) return { correct: true, matched: reading }
  }
  return { correct: false }
}

/** Live kana for a half-typed romaji answer: a trailing lone "n" waits for the next letter. */
export function previewKana(input: string): string {
  return toKana(input.trim().toLowerCase(), { IMEMode: true })
}

/** Hepburn romaji for a reading, shown beside kana for learners who type on a Latin keyboard. */
export function romajiFor(reading: string): string {
  return toRomaji(reading)
}

export function looksLikeKana(input: string): boolean {
  return input.length > 0 && isKana(input)
}

/**
 * A spoken answer is right when any recognition alternative is the reading, or spells the word
 * itself (recognisers usually return kanji for a known word).
 */
export function checkSpoken(
  alternatives: string[],
  accepted: string[],
  forms: string[],
): ReadingCheck {
  const clean = (s: string) => s.trim().replace(/[\s\u3000.,!?\u3002\u3001\uff01\uff1f]/g, '')
  for (const alt of alternatives) {
    const said = clean(alt)
    if (said.length === 0) continue
    if (forms.some((f) => clean(f) === said)) return { correct: true, matched: said }
    const reading = checkReading(said, accepted)
    if (reading.correct) return reading
  }
  return { correct: false }
}
