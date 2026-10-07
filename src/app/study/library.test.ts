import { describe, expect, it } from 'vitest'

import { weaveDerived } from './library'

describe('weaveDerived', () => {
  it('slots a derived card after every two fresh ones and keeps the rest at the end', () => {
    expect(weaveDerived(['a', 'b', 'c', 'd', 'e'], ['X', 'Y', 'Z'])).toEqual([
      'a',
      'b',
      'X',
      'c',
      'd',
      'Y',
      'e',
      'Z',
    ])
    expect(weaveDerived([], ['X'])).toEqual(['X'])
    expect(weaveDerived(['a'], [])).toEqual(['a'])
  })
})
