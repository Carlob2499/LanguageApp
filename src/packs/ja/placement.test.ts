import { describe, expect, it } from 'vitest'

import { buildQuestion, usable } from './placement'
import type { VocabItem } from './types'

function word(id: number, form: string, reading: string, gloss: string): VocabItem {
  return {
    id: `v:${id}`,
    seq: id,
    level: 'N5',
    forms: [{ text: form, common: true }],
    readings: [{ text: reading, common: true }],
    senses: [{ gloss: [gloss], pos: [], misc: [] }],
    kanji: [...form],
    priority: 1,
  } as unknown as VocabItem
}

const pool = [
  word(1, '学校', 'がっこう', 'school'),
  word(2, '先生', 'せんせい', 'teacher'),
  word(3, '電車', 'でんしゃ', 'train'),
  word(4, '映画', 'えいが', 'movie'),
  word(5, '図書館', 'としょかん', 'library'),
  word(6, '時間', 'じかん', 'time'),
]

describe('placement questions', () => {
  it('builds a meaning question with one right answer and three others', () => {
    const q = buildQuestion(pool[0]!, pool, 'meaning', 0, () => 0.3)!
    expect(q.options).toHaveLength(4)
    expect(q.options.find((o) => o.id === q.correctId)!.text).toBe('school')
    expect(new Set(q.options.map((o) => o.text)).size).toBe(4)
  })

  it('builds a reading question from readings of similar length', () => {
    const q = buildQuestion(pool[1]!, pool, 'reading', 1, () => 0.6)!
    expect(q.options.find((o) => o.id === q.correctId)!.text).toBe('せんせい')
    for (const o of q.options) expect(Math.abs([...o.text].length - 4)).toBeLessThanOrEqual(1)
  })

  it('refuses when the pool cannot supply three wrong answers', () => {
    expect(buildQuestion(pool[0]!, pool.slice(0, 3), 'meaning', 0)).toBeUndefined()
  })

  it('only uses common words written with kanji', () => {
    expect(usable(pool[0]!)).toBe(true)
    expect(usable(word(9, 'ああ', 'ああ', 'ah'))).toBe(false)
  })
})
