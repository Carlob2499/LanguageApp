/**
 * Placement by a Yes/No vocabulary test with pseudoword lures, run as an adaptive staircase over
 * level bands. The learner says "know" or "don't know" to each item; a block's score is the hit
 * rate on real words corrected by the false-alarm rate on pseudowords. The estimate is a starting
 * point, never a certificate.
 */
export interface PlacementItem {
  text: string
  /** Real word (band index) or lure. */
  real: boolean
  band: number
  /** Reading or gloss shown as the item's secondary line, never for lures. */
  hint?: string
}

export interface PlacementConfig {
  bands: string[]
  blockSize: number
  luresPerBlock: number
  /** Corrected score at or above which the learner moves up a band. */
  up: number
  /** Corrected score below which the learner moves down a band. */
  down: number
  maxBlocks: number
}

export const DEFAULT_PLACEMENT: PlacementConfig = {
  bands: ['N5', 'N4', 'N3', 'N2', 'N1'],
  blockSize: 6,
  luresPerBlock: 2,
  up: 0.6,
  down: 0.3,
  maxBlocks: 7,
}

export interface PlacementState {
  config: PlacementConfig
  band: number
  block: PlacementItem[]
  index: number
  answers: boolean[]
  /** Corrected score per completed block, keyed by band. */
  scores: Array<{ band: number; score: number }>
  reversals: number
  lastDirection: 'up' | 'down' | null
  done: boolean
}

export interface ItemSource {
  /** Returns `count` fresh real items for a band. */
  real: (band: number, count: number) => PlacementItem[]
  /** Returns `count` fresh lures. */
  lure: (count: number) => PlacementItem[]
  /** Deterministic shuffle for tests; defaults to Math.random. */
  shuffle?: <T>(items: T[]) => T[]
}

function makeBlock(state: PlacementState, source: ItemSource): PlacementItem[] {
  const real = source.real(state.band, state.config.blockSize - state.config.luresPerBlock)
  const lures = source.lure(state.config.luresPerBlock)
  const shuffle = source.shuffle ?? ((items) => [...items].sort(() => Math.random() - 0.5))
  return shuffle([...real, ...lures])
}

export function startPlacement(
  source: ItemSource,
  config: PlacementConfig = DEFAULT_PLACEMENT,
): PlacementState {
  const base: PlacementState = {
    config,
    band: 0,
    block: [],
    index: 0,
    answers: [],
    scores: [],
    reversals: 0,
    lastDirection: null,
    done: false,
  }
  return { ...base, block: makeBlock(base, source) }
}

export function currentItem(state: PlacementState): PlacementItem | undefined {
  return state.done ? undefined : state.block[state.index]
}

export function progress(state: PlacementState): { done: number; total: number } {
  return {
    done: state.scores.length * state.config.blockSize + state.index,
    total: state.config.maxBlocks * state.config.blockSize,
  }
}

/** Corrected recognition: hits on real words minus false alarms on lures (each lure counts double). */
export function blockScore(block: PlacementItem[], answers: boolean[]): number {
  const reals = block.filter((i) => i.real).length
  const lures = block.length - reals
  let hits = 0
  let falseAlarms = 0
  block.forEach((item, i) => {
    if (!answers[i]) return
    if (item.real) hits++
    else falseAlarms++
  })
  const hitRate = reals === 0 ? 0 : hits / reals
  const faRate = lures === 0 ? 0 : falseAlarms / lures
  return Math.max(0, hitRate - faRate)
}

export function answerPlacement(
  state: PlacementState,
  knows: boolean,
  source: ItemSource,
): PlacementState {
  if (state.done) return state
  const answers = [...state.answers, knows]
  if (answers.length < state.block.length) return { ...state, answers, index: state.index + 1 }

  const score = blockScore(state.block, answers)
  const scores = [...state.scores, { band: state.band, score }]
  const top = state.config.bands.length - 1
  let direction: 'up' | 'down' | null = null
  let band = state.band
  if (score >= state.config.up && band < top) {
    direction = 'up'
    band++
  } else if (score < state.config.down && band > 0) {
    direction = 'down'
    band--
  }
  const reversals =
    state.reversals +
    (direction && state.lastDirection && direction !== state.lastDirection ? 1 : 0)
  const atTop = score >= state.config.up && state.band === top
  const atBottom = score < state.config.down && state.band === 0
  const done =
    direction === null ||
    reversals >= 2 ||
    scores.length >= state.config.maxBlocks ||
    atTop ||
    atBottom
  const next: PlacementState = {
    ...state,
    band,
    answers: [],
    index: 0,
    scores,
    reversals,
    lastDirection: direction ?? state.lastDirection,
    done,
    block: [],
  }
  return done ? next : { ...next, block: makeBlock(next, source) }
}

/** The highest band the learner cleared; N5 (index 0) when none. */
export function estimateBand(state: PlacementState): number {
  let best = 0
  for (const { band, score } of state.scores)
    if (score >= state.config.up && band + 1 > best) best = band + 1
  return Math.min(best, state.config.bands.length - 1)
}
