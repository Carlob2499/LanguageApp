import { describe, expect, it } from 'vitest'

import { checkReading, normaliseReading } from './grading'

describe('reading grader', () => {
  it('accepts romaji, hiragana and katakana spellings of the same reading', () => {
    expect(checkReading('ekimae', ['えきまえ'])).toEqual({ correct: true, matched: 'えきまえ' })
    expect(checkReading('えきまえ', ['えきまえ']).correct).toBe(true)
    expect(checkReading('エキマエ', ['えきまえ']).correct).toBe(true)
  })
  it('accepts any of several readings and rejects others', () => {
    expect(checkReading('nihon', ['にほん', 'にっぽん']).matched).toBe('にほん')
    expect(checkReading('nippon', ['にほん', 'にっぽん']).matched).toBe('にっぽん')
    expect(checkReading('nihongo', ['にほん', 'にっぽん']).correct).toBe(false)
  })
  it('ignores spaces and punctuation, and rejects empty answers', () => {
    expect(normaliseReading(' eki mae ')).toBe('えきまえ')
    expect(checkReading('   ', ['えき']).correct).toBe(false)
  })
})
