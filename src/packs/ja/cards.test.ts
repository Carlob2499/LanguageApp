import { describe, expect, it } from 'vitest'

import { cardTypesFor, displayForm, readingsFor } from './cards'
import type { VocabItem } from './types'

const word: VocabItem = {
  id: 'v:1',
  seq: 1,
  level: 'N5',
  forms: [
    { text: '日本', common: true },
    { text: '日ノ本', common: false },
  ],
  readings: [
    { text: 'にほん', common: true },
    { text: 'にっぽん', common: true },
    { text: 'ひのもと', common: false, restrictTo: ['日ノ本'] },
  ],
  senses: [{ gloss: ['Japan'], pos: ['n'], misc: [] }],
  kanji: ['日', '本'],
  priority: 2,
}

describe('ja card profile', () => {
  it('shows the common form and only the readings that apply to it', () => {
    expect(displayForm(word)).toBe('日本')
    expect(readingsFor(word, '日本')).toEqual(['にほん', 'にっぽん'])
    expect(readingsFor(word, '日ノ本')).toEqual(['にほん', 'にっぽん', 'ひのもと']) // unrestricted readings apply to every form
  })
  it('gives kana-only words no reading card', () => {
    expect(cardTypesFor('vocab', word)).toEqual(['vocab-meaning', 'vocab-reading'])
    expect(cardTypesFor('vocab', { ...word, forms: [], kanji: [] })).toEqual(['vocab-meaning'])
  })
})
