import { describe, expect, it } from 'vitest'

import { contrastRatio, relativeLuminance } from './color'

describe('contrastRatio', () => {
  it('black on white is 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })
  it('is symmetric', () => {
    expect(contrastRatio('#d9a441', '#1c0d0b')).toBeCloseTo(contrastRatio('#1c0d0b', '#d9a441'), 10)
  })
  it('rejects malformed input', () => {
    expect(() => relativeLuminance('d9a4')).toThrow()
  })
})
