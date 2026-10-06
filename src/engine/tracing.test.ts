import { describe, expect, it } from 'vitest'

import { centroid, flattenPath, pathLength, resample } from './stroke-path'
import { INITIAL_TRACING, matchStroke, tracingReducer } from './tracing'

// 日 from KanjiVG (N5 pack), four strokes.
const NICHI = [
  'M30.25,22.25c0.75,0.75,1.07,2.12,1.07,3.5c0,8.25-0.07,53.25-0.07,61.25',
  'M32.07,24.07c3.43-0.07,37.43-3.07,40.43-3.07c3.25,0,4.75,1,4.75,4c0,8-0.25,51.75-0.25,57.25',
  'M32.32,53.5c7.43-0.5,36.43-2.75,43.18-3',
  'M32.57,83.75c7.43-0.5,36.93-1.75,43.93-2',
]

function jitter(points: ReadonlyArray<readonly [number, number]>, amount: number) {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2
  return points.map(([x, y]) => [x + rnd() * amount, y + rnd() * amount] as const)
}

describe('stroke paths', () => {
  it('flattens relative cubic curves into a polyline that starts at M and ends at the last point', () => {
    const pts = flattenPath(NICHI[0]!)
    expect(pts[0]).toEqual([30.25, 22.25])
    const last = pts[pts.length - 1]!
    expect(last[0]).toBeCloseTo(31.25, 2)
    expect(last[1]).toBeCloseTo(87, 2)
    expect(pathLength(pts)).toBeGreaterThan(60)
  })

  it('handles S (smooth) curves and absolute commands', () => {
    const pts = flattenPath('M10,10 C20,0 30,20 40,10 S60,20 70,10')
    expect(pts[pts.length - 1]).toEqual([70, 10])
    expect(pts.length).toBe(1 + 12 + 12)
  })

  it('resamples to evenly spaced points and keeps the ends', () => {
    const pts = resample(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      5,
    )
    expect(pts).toHaveLength(5)
    expect(pts[0]).toEqual([0, 0])
    expect(pts[4]).toEqual([10, 10])
    expect(pts[2]).toEqual([10, 0])
    expect(centroid(pts)[0]).toBeGreaterThan(5)
  })
})

describe('matchStroke', () => {
  const target = flattenPath(NICHI[1]!)

  it('accepts a wobbly trace that follows the stroke', () => {
    const drawn = jitter(resample(target, 20), 4)
    const result = matchStroke(drawn, target)
    expect(result.ok).toBe(true)
    expect(result.meanDistance).toBeLessThan(6)
  })

  it('rejects the stroke drawn backwards', () => {
    const drawn = [...resample(target, 20)].reverse()
    expect(matchStroke(drawn, target).reason).toBe('backwards')
  })

  it('rejects a tap and a stroke that is far too short', () => {
    expect(matchStroke([[32, 24]], target).reason).toBe('short')
    expect(matchStroke(resample(target, 20).slice(0, 5), target).reason).toBe('short')
  })

  it('rejects a stroke drawn somewhere else', () => {
    const drawn = resample(target, 20).map(([x, y]) => [x - 40, y] as const)
    expect(matchStroke(drawn, target).ok).toBe(false)
  })

  it('rejects a different stroke of the same character', () => {
    const other = flattenPath(NICHI[2]!)
    expect(matchStroke(resample(other, 20), target).ok).toBe(false)
  })
})

describe('tracingReducer', () => {
  const ok = { ok: true, meanDistance: 1, startDistance: 1, endDistance: 1, lengthRatio: 1 }
  const miss = { ...ok, ok: false, reason: 'start' as const }

  it('advances on a hit, counts misses, and skips past a stroke', () => {
    let s = tracingReducer(INITIAL_TRACING, { type: 'result', result: miss }, 4)
    expect(s.misses).toBe(1)
    expect(s.lastReason).toBe('start')
    s = tracingReducer(s, { type: 'result', result: ok }, 4)
    expect(s.index).toBe(1)
    expect(s.misses).toBe(0)
    expect(s.lastReason).toBeUndefined()
    s = tracingReducer(s, { type: 'skip' }, 4)
    expect(s.index).toBe(2)
    expect(s.skipped).toEqual([1])
    expect(s.attempts).toBe(2)
  })

  it('ignores input after the last stroke', () => {
    const done = { ...INITIAL_TRACING, index: 4 }
    expect(tracingReducer(done, { type: 'result', result: ok }, 4)).toBe(done)
  })
})
