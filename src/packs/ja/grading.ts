import { isKana, toHiragana } from 'wanakana'

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

export function looksLikeKana(input: string): boolean {
  return input.length > 0 && isKana(input)
}
