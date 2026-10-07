import { describe, expect, it } from 'vitest'

import { checkReading, checkSpoken, normaliseReading } from './grading'

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

describe('checkSpoken', () => {
  it('accepts the reading in kana, the word in kanji, or any alternative; rejects others', () => {
    expect(checkSpoken(['えき'], ['えき'], ['駅']).correct).toBe(true)
    expect(checkSpoken(['駅。'], ['えき'], ['駅']).correct).toBe(true)
    expect(checkSpoken(['息', 'えき'], ['えき'], ['駅']).correct).toBe(true)
    expect(checkSpoken(['いき'], ['えき'], ['駅']).correct).toBe(false)
    expect(checkSpoken([], ['えき'], ['駅']).correct).toBe(false)
  })
})

import { previewKana, romajiFor } from './grading'

describe('romaji typing helpers', () => {
  it('turns romaji into kana as it is typed', () => {
    expect(previewKana('gakkou')).toBe('がっこう')
    expect(previewKana('Sensei')).toBe('せんせい')
    expect(previewKana('kan')).toBe('かn')
  })
  it('writes a reading back as romaji', () => {
    expect(romajiFor('がっこう')).toBe('gakkou')
  })
})
