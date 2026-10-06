import { type Point, pathLength, resample } from './stroke-path'

/** All distances are in KanjiVG box units (the glyph is 109 × 109). */
export interface MatchOptions {
  /** Mean point-to-point distance allowed after resampling. */
  tolerance?: number
  /** How far the drawn start and end may sit from the stroke's own. */
  endTolerance?: number
  minLengthRatio?: number
  maxLengthRatio?: number
  samples?: number
}

export type MatchReason = 'short' | 'long' | 'start' | 'end' | 'backwards' | 'shape'

export interface MatchResult {
  ok: boolean
  reason?: MatchReason
  meanDistance: number
  startDistance: number
  endDistance: number
  lengthRatio: number
}

export const FORGIVING: Required<MatchOptions> = {
  tolerance: 11,
  endTolerance: 18,
  minLengthRatio: 0.55,
  maxLengthRatio: 1.75,
  samples: 32,
}

/** Mean distance between two polylines sampled at the same arc-length fractions. */
function meanDistance(a: readonly Point[], b: readonly Point[]): number {
  let sum = 0
  for (let k = 0; k < a.length; k++) {
    sum += Math.hypot(a[k]![0] - b[k]![0], a[k]![1] - b[k]![1])
  }
  return sum / a.length
}

/**
 * Compares a drawn polyline with the stroke it should follow. Forgiving on wobble and speed,
 * strict on where a stroke starts, where it ends and which way it goes, because that is what
 * stroke order teaches.
 */
export function matchStroke(
  drawn: readonly Point[],
  target: readonly Point[],
  options: MatchOptions = {},
): MatchResult {
  const o = { ...FORGIVING, ...options }
  const targetLen = pathLength(target)
  const drawnLen = pathLength(drawn)
  const lengthRatio = targetLen === 0 ? 0 : drawnLen / targetLen
  const t = resample(target, o.samples)
  const d = resample(drawn.length > 0 ? drawn : [[Number.NaN, Number.NaN]], o.samples)
  const startDistance = Math.hypot(d[0]![0] - t[0]![0], d[0]![1] - t[0]![1])
  const endDistance = Math.hypot(
    d[d.length - 1]![0] - t[t.length - 1]![0],
    d[d.length - 1]![1] - t[t.length - 1]![1],
  )
  const forward = meanDistance(d, t)
  const base = { meanDistance: forward, startDistance, endDistance, lengthRatio }
  if (drawn.length < 2 || lengthRatio < o.minLengthRatio) {
    return { ...base, ok: false, reason: 'short' }
  }
  if (lengthRatio > o.maxLengthRatio) return { ...base, ok: false, reason: 'long' }
  // A stroke that fits the shape only when reversed was drawn backwards.
  const backward = meanDistance([...d].reverse(), t)
  if (backward < forward && backward <= o.tolerance) {
    return { ...base, ok: false, reason: 'backwards' }
  }
  if (startDistance > o.endTolerance) return { ...base, ok: false, reason: 'start' }
  if (endDistance > o.endTolerance) return { ...base, ok: false, reason: 'end' }
  if (forward > o.tolerance) return { ...base, ok: false, reason: 'shape' }
  return { ...base, ok: true }
}

export const REASON_COPY: Record<MatchReason, string> = {
  short: 'A bit short. Follow the stroke all the way.',
  long: 'That went past the end of the stroke.',
  start: 'Start where the stroke starts.',
  end: 'Close, but the end drifted.',
  backwards: 'Right shape, wrong direction.',
  shape: 'Not quite the shape. Watch it once more.',
}

export interface TracingState {
  /** Index of the stroke being traced; equals the stroke count when finished. */
  index: number
  /** Failed attempts on the current stroke. */
  misses: number
  /** Total attempts across the whole character. */
  attempts: number
  /** Strokes the learner skipped after seeing the hint. */
  skipped: number[]
  lastReason?: MatchReason
}

export const INITIAL_TRACING: TracingState = { index: 0, misses: 0, attempts: 0, skipped: [] }

export type TracingAction =
  | { type: 'result'; result: MatchResult }
  | { type: 'skip' }
  | { type: 'reset' }

export function tracingReducer(
  state: TracingState,
  action: TracingAction,
  strokeCount: number,
): TracingState {
  switch (action.type) {
    case 'reset':
      return INITIAL_TRACING
    case 'skip':
      if (state.index >= strokeCount) return state
      return {
        ...state,
        index: state.index + 1,
        misses: 0,
        skipped: [...state.skipped, state.index],
      }
    case 'result': {
      if (state.index >= strokeCount) return state
      const attempts = state.attempts + 1
      if (action.result.ok) {
        return { index: state.index + 1, misses: 0, attempts, skipped: state.skipped }
      }
      return {
        ...state,
        misses: state.misses + 1,
        attempts,
        ...(action.result.reason ? { lastReason: action.result.reason } : {}),
      }
    }
  }
}

/** After this many misses on one stroke the hint plays by itself. */
export const HINT_AFTER_MISSES = 2
