import { describe, expect, it } from 'vitest'

import { clamp01, comboBeat, eio, mulberry32, outBack, outCubic, seg } from './ease'

describe('ease', () => {
  it('clamps and windows time', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(2)).toBe(1)
    expect(seg(0.5, 0, 1)).toBe(0.5)
    expect(seg(0, 1, 2)).toBe(0)
    expect(seg(3, 1, 2)).toBe(1)
  })

  it('every curve starts at 0 and ends at 1', () => {
    for (const f of [eio, outCubic, outBack]) {
      expect(f(0)).toBeCloseTo(0, 6)
      expect(f(1)).toBeCloseTo(1, 6)
    }
  })

  it('the seal curve overshoots before it settles', () => {
    expect(Math.max(...Array.from({ length: 50 }, (_, i) => outBack(i / 49)))).toBeGreaterThan(1)
  })

  it('is deterministic for a seed', () => {
    const a = mulberry32(7)
    const b = mulberry32(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    expect(mulberry32(8)()).not.toBe(mulberry32(7)())
  })

  it('flourishes land on 3, 5, 10 and every ten after', () => {
    expect([1, 2, 3, 4, 5, 9, 10, 11, 20].map(comboBeat)).toEqual([
      undefined,
      undefined,
      3,
      undefined,
      5,
      undefined,
      10,
      undefined,
      10,
    ])
  })
})
