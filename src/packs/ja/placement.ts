import { displayForm, primaryGloss, readingsFor } from './cards'
import type { VocabItem } from './types'

export type QuestionKind = 'meaning' | 'reading'

export interface Option {
  id: string
  text: string
}

export interface Question {
  id: string
  /** 0 = N5 .. 4 = N1, the level the word comes from. */
  level: number
  kind: QuestionKind
  /** The written form shown to the learner. */
  form: string
  options: Option[]
  correctId: string
}

const CJK = /[㐀-䶿一-鿿豈-﫿]/u

/** Words fit for a question: common, written with kanji, with a short first gloss. */
export function usable(word: VocabItem): boolean {
  const form = displayForm(word)
  const gloss = primaryGloss(word)
  return CJK.test(form) && gloss.length >= 2 && gloss.length <= 34 && word.priority > 0
}

function shuffled<T>(items: T[], rand: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

/**
 * One question for `word`, with three look-alike wrong answers drawn from the same level so the
 * level of the word, not the oddness of the options, decides how hard it is. Returns undefined
 * when the pool cannot supply three distinct wrong answers.
 */
export function buildQuestion(
  word: VocabItem,
  pool: VocabItem[],
  kind: QuestionKind,
  level: number,
  rand: () => number = Math.random,
): Question | undefined {
  const form = displayForm(word)
  const reading = readingsFor(word, form)[0]
  if (!reading) return undefined
  const correctText = kind === 'meaning' ? primaryGloss(word) : reading
  const taken = new Set([correctText.toLowerCase()])
  const wrong: string[] = []
  for (const other of shuffled(pool, rand)) {
    if (other.id === word.id) continue
    const otherForm = displayForm(other)
    const text = kind === 'meaning' ? primaryGloss(other) : (readingsFor(other, otherForm)[0] ?? '')
    if (!text || text.length > 40 || taken.has(text.toLowerCase())) continue
    // Readings of a similar length look like real candidates; meanings need no such care.
    if (kind === 'reading' && Math.abs([...text].length - [...reading].length) > 1) continue
    // A gloss that shares its first word with the answer would be a second right answer.
    if (
      kind === 'meaning' &&
      text.split(/[ ;,]/)[0]!.toLowerCase() === correctText.split(/[ ;,]/)[0]!.toLowerCase()
    )
      continue
    taken.add(text.toLowerCase())
    wrong.push(text)
    if (wrong.length === 3) break
  }
  if (wrong.length < 3) return undefined
  const options = shuffled(
    [correctText, ...wrong].map((text, i) => ({ id: i === 0 ? 'right' : `w${i}`, text })),
    rand,
  )
  return { id: `${word.id}:${kind}`, level, kind, form, options, correctId: 'right' }
}
