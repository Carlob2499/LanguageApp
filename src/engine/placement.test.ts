import { describe, expect, it } from 'vitest'

import {
  answerPlacement,
  blockScore,
  currentItem,
  DEFAULT_PLACEMENT,
  estimateBand,
  startPlacement,
  type ItemSource,
  type PlacementState,
} from './placement'

const source: ItemSource = {
  real: (band, n) =>
    Array.from({ length: n }, (_, i) => ({ text: `w${band}-${i}`, real: true, band })),
  lure: (n) => Array.from({ length: n }, (_, i) => ({ text: `lure${i}`, real: false, band: -1 })),
  shuffle: (items) => items,
}

/** Simulates a learner who knows every real word up to `knownBand` and never claims a lure. */
function run(knownBand: number): PlacementState {
  let s = startPlacement(source, DEFAULT_PLACEMENT)
  let guard = 0
  while (!s.done && guard++ < 100) {
    const item = currentItem(s)!
    s = answerPlacement(s, item.real && item.band <= knownBand, source)
  }
  return s
}

describe('placement staircase', () => {
  it('scores a block by hits minus false alarms', () => {
    const block = [
      { text: 'a', real: true, band: 0 },
      { text: 'b', real: true, band: 0 },
      { text: 'x', real: false, band: -1 },
      { text: 'y', real: false, band: -1 },
    ]
    expect(blockScore(block, [true, true, false, false])).toBe(1)
    expect(blockScore(block, [true, true, true, true])).toBe(0)
    expect(blockScore(block, [true, false, true, false])).toBe(0)
  })

  it('places a complete beginner at N5 after one block', () => {
    const s = run(-1)
    expect(s.done).toBe(true)
    expect(s.scores).toHaveLength(1)
    expect(estimateBand(s)).toBe(0)
  })

  it('climbs to the highest band a learner clears and stops there', () => {
    expect(estimateBand(run(2))).toBe(3) // cleared N5, N4, N3 → start at N2 content
    expect(estimateBand(run(4))).toBe(4) // cleared everything → N1
  })

  it('never claims more than the top band and finishes within the block budget', () => {
    const s = run(4)
    expect(s.scores.length).toBeLessThanOrEqual(DEFAULT_PLACEMENT.maxBlocks)
    expect(estimateBand(s)).toBeLessThanOrEqual(DEFAULT_PLACEMENT.bands.length - 1)
  })

  it('reports progress out of the block budget', () => {
    const s = startPlacement(source)
    expect(s.block).toHaveLength(6)
    expect(currentItem(s)?.text).toBe('w0-0')
  })
})
