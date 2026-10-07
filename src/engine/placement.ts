/**
 * Adaptive placement. The learner answers real multiple-choice questions (what a word means,
 * how it is read) and the test keeps a probability for each possible "ability": how many JLPT
 * levels, counted from N5, they have already mastered (0 to 5). Every answer updates those
 * probabilities, and the next question comes from the level that will tell us the most. It stops
 * as soon as the answer is clear, and never after more than 20 questions.
 *
 * Questions are checked answers, so unlike a yes/no vocabulary test the result does not depend on
 * how honest or modest the learner is. The result is still a starting point, not a certificate.
 */

/** Number of levels (N5..N1). Ability runs 0..LEVELS: levels below it are mastered. */
export const LEVELS_COUNT = 5
export const MAX_QUESTIONS = 20
export const MIN_QUESTIONS = 10
/** Stop early once one ability holds this much of the probability. */
export const CONFIDENT = 0.8

/** P(correct | learner has mastered this level, is partway through it, or has not reached it). */
const P_MASTERED = 0.93
const P_PARTWAY = 0.55
const P_BEYOND = 0.1
/** A wrong or "not sure" answer is just the complement; guessing is already in P_BEYOND. */

export interface Answered {
  level: number
  correct: boolean
}

export interface PlacementState {
  /** Probability of each ability 0..LEVELS_COUNT; sums to 1. */
  posterior: number[]
  answers: Answered[]
  done: boolean
}

export function startPlacement(): PlacementState {
  const n = LEVELS_COUNT + 1
  return { posterior: Array.from({ length: n }, () => 1 / n), answers: [], done: false }
}

/** Chance of a correct answer on a level-`level` question for a learner of this ability. */
export function pCorrect(ability: number, level: number): number {
  if (level < ability) return P_MASTERED
  if (level === ability) return P_PARTWAY
  return P_BEYOND
}

function normalise(p: number[]): number[] {
  const total = p.reduce((a, b) => a + b, 0)
  return p.map((x) => x / total)
}

function posteriorAfter(posterior: number[], level: number, correct: boolean): number[] {
  return normalise(
    posterior.map((p, a) => p * (correct ? pCorrect(a, level) : 1 - pCorrect(a, level))),
  )
}

function entropy(p: number[]): number {
  return -p.reduce((sum, x) => (x > 0 ? sum + x * Math.log2(x) : sum), 0)
}

/** The level whose next question is expected to leave the least uncertainty. */
export function chooseLevel(posterior: number[], asked: number[] = []): number {
  let best = 0
  let bestScore = Infinity
  for (let level = 0; level < LEVELS_COUNT; level++) {
    const pRight = posterior.reduce((s, p, a) => s + p * pCorrect(a, level), 0)
    let expected =
      pRight * entropy(posteriorAfter(posterior, level, true)) +
      (1 - pRight) * entropy(posteriorAfter(posterior, level, false))
    // Variety: a small penalty for asking the same level many times in a row.
    const streak = asked.slice(-3).filter((l) => l === level).length
    expected += streak >= 3 ? 0.15 : 0
    if (expected < bestScore - 1e-9) {
      bestScore = expected
      best = level
    }
  }
  return best
}

export function nextLevel(state: PlacementState): number {
  return chooseLevel(
    state.posterior,
    state.answers.map((a) => a.level),
  )
}

export function mostLikely(posterior: number[]): { ability: number; confidence: number } {
  let ability = 0
  posterior.forEach((p, a) => {
    if (p > (posterior[ability] ?? 0)) ability = a
  })
  return { ability, confidence: posterior[ability] ?? 0 }
}

export function answerPlacement(state: PlacementState, level: number, correct: boolean) {
  if (state.done) return state
  const posterior = posteriorAfter(state.posterior, level, correct)
  const answers = [...state.answers, { level, correct }]
  const { confidence } = mostLikely(posterior)
  const done =
    answers.length >= MAX_QUESTIONS || (answers.length >= MIN_QUESTIONS && confidence >= CONFIDENT)
  return { posterior, answers, done }
}

/** Expected ability, 0..LEVELS_COUNT: where the level meter's marker sits. */
export function meter(state: PlacementState): number {
  return state.posterior.reduce((s, p, a) => s + p * a, 0)
}

/** Level index (0 = N5) to start at: the first level not yet mastered. */
export function startLevelIndex(state: PlacementState): number {
  return Math.min(mostLikely(state.posterior).ability, LEVELS_COUNT - 1)
}

export function progress(state: PlacementState): { done: number; total: number } {
  return { done: state.answers.length, total: MAX_QUESTIONS }
}
