import { describe, expect, it } from 'vitest'

import type { StrokeItem } from '@/packs/ja/types'

import { buildPieces, toWorld } from './pieces'

const item: StrokeItem = {
  id: 'strokes:明',
  char: '明',
  strokes: [
    { d: 'M20,20c0,20,0,40,0,60' },
    { d: 'M20,20c10,0,20,0,30,0' },
    { d: 'M60,20c0,20,0,40,0,60' },
    { d: 'M60,20c10,0,20,0,30,0' },
    { d: 'M5,100c5,0,10,0,15,0' },
  ],
  numbers: [
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
  ],
  groups: [
    { element: '日', position: 'left', strokes: [0, 1], children: [] },
    { element: '月', position: 'right', strokes: [2, 3], children: [] },
  ],
}

describe('buildPieces', () => {
  it('maps the KanjiVG box to a centred, y-up world', () => {
    expect(toWorld([54.5, 54.5])).toEqual([0, 0])
    expect(toWorld([109, 0])).toEqual([5.45, 5.45])
  })

  it('makes one piece per group plus one for loose strokes, exploding away from the centre', () => {
    const pieces = buildPieces(item)
    expect(pieces.map((p) => p.element)).toEqual(['日', '月', undefined])
    expect(pieces[2]!.strokeIndices).toEqual([4])
    // 日 sits left of centre, so it flies left; 月 flies right.
    expect(pieces[0]!.explode[0]).toBeLessThan(0)
    expect(pieces[1]!.explode[0]).toBeGreaterThan(0)
    // Depths are spread so pieces don't share a plane.
    expect(new Set(pieces.map((p) => p.explode[2])).size).toBe(3)
  })

  it('is deterministic', () => {
    expect(buildPieces(item)).toEqual(buildPieces(item))
  })
})
