import { describe, expect, it } from 'vitest'

import {
  answerPlacement,
  chooseLevel,
  LEVELS_COUNT,
  MAX_QUESTIONS,
  meter,
  MIN_QUESTIONS,
  nextLevel,
  startLevelIndex,
  startPlacement,
  type PlacementState,
} from './placement'

/**
 * A learner who has mastered every level below `mastered`, gets about half of the questions at the
 * level they are working on, and none above it.
 */
function run(mastered: number, slipEvery = 0): PlacementState {
  let s = startPlacement()
  let n = 0
  while (!s.done) {
    const level = nextLevel(s)
    n++
    const frontier = level === mastered && n % 2 === 0
    const knows = (level < mastered || frontier) && !(slipEvery && n % slipEvery === 0)
    s = answerPlacement(s, level, knows)
  }
  return s
}

describe('adaptive placement', () => {
  it('starts with no opinion', () => {
    const s = startPlacement()
    expect(s.posterior).toHaveLength(LEVELS_COUNT + 1)
    expect(s.posterior.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
    expect(s.done).toBe(false)
  })

  it('never asks more than 20 questions and never fewer than the minimum', () => {
    for (let mastered = 0; mastered <= LEVELS_COUNT; mastered++) {
      const s = run(mastered)
      expect(s.answers.length).toBeGreaterThanOrEqual(MIN_QUESTIONS)
      expect(s.answers.length).toBeLessThanOrEqual(MAX_QUESTIONS)
    }
  })

  it('places a clean learner at the first level they have not mastered', () => {
    expect(startLevelIndex(run(0))).toBe(0)
    expect(startLevelIndex(run(1))).toBe(1)
    expect(startLevelIndex(run(2))).toBe(2)
    expect(startLevelIndex(run(3))).toBe(3)
    expect(startLevelIndex(run(4))).toBe(4)
    // Someone who has mastered everything still starts at N1, the top.
    expect(startLevelIndex(run(5))).toBe(4)
  })

  it('stays within one level for a learner who slips now and then', () => {
    for (let mastered = 1; mastered <= 4; mastered++) {
      const placed = startLevelIndex(run(mastered, 6))
      expect(Math.abs(placed - mastered)).toBeLessThanOrEqual(1)
    }
  })

  it('moves up after right answers and down after wrong ones', () => {
    let up = startPlacement()
    for (let i = 0; i < 3; i++) up = answerPlacement(up, nextLevel(up), true)
    let down = startPlacement()
    for (let i = 0; i < 3; i++) down = answerPlacement(down, nextLevel(down), false)
    expect(meter(up)).toBeGreaterThan(meter(startPlacement()))
    expect(meter(down)).toBeLessThan(meter(startPlacement()))
    expect(nextLevel(up)).toBeGreaterThan(nextLevel(down))
  })

  it('asks about levels near the estimate, not all five', () => {
    const asked = new Set(run(2).answers.map((a) => a.level))
    expect(asked.size).toBeLessThanOrEqual(4)
  })

  it('does not ask one level more than three times in a row', () => {
    expect(chooseLevel(startPlacement().posterior, [2, 2, 2])).not.toBe(2)
  })

  it('ignores answers after it is done', () => {
    const s = run(2)
    expect(answerPlacement(s, 0, true)).toBe(s)
  })
})
