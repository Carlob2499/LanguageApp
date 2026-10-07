import type { Grade, ReviewRecord, StudyCard } from './types'

/**
 * Pure session state machine. Cards that come back due within the session (FSRS learning
 * steps) are re-queued at the end so a lapse is seen again before the session closes.
 */
export interface SessionState {
  queue: StudyCard[]
  /** Index of the current card in `queue`; equals queue.length when done. */
  index: number
  revealed: boolean
  /** Reviews in order, newest last; each entry can be undone. */
  history: Array<{ before: StudyCard; after: StudyCard; record: ReviewRecord; requeued: boolean }>
  startedAt: number
}

export type SessionAction =
  | { type: 'reveal' }
  | {
      type: 'graded'
      before: StudyCard
      after: StudyCard
      record: ReviewRecord
      now: number
      sessionWindowMs: number
    }
  | { type: 'undo' }
  /** Drops the current card from this session without a review (its item is unavailable). */
  | { type: 'skip' }

export function createSession(queue: StudyCard[], startedAt: number): SessionState {
  return { queue, index: 0, revealed: false, history: [], startedAt }
}

export function currentCard(state: SessionState): StudyCard | undefined {
  return state.queue[state.index]
}

export function isComplete(state: SessionState): boolean {
  return state.index >= state.queue.length
}

export function progress(state: SessionState): { done: number; total: number } {
  return { done: Math.min(state.index, state.queue.length), total: state.queue.length }
}

export function reduceSession(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'reveal':
      return state.revealed || isComplete(state) ? state : { ...state, revealed: true }
    case 'graded': {
      if (isComplete(state)) return state
      const requeued = action.after.due <= action.now + action.sessionWindowMs
      const queue = requeued ? [...state.queue, action.after] : state.queue
      return {
        ...state,
        queue,
        index: state.index + 1,
        revealed: false,
        history: [
          ...state.history,
          { before: action.before, after: action.after, record: action.record, requeued },
        ],
      }
    }
    case 'skip': {
      if (isComplete(state)) return state
      // Removing the card (rather than stepping past it) keeps undo aligned with the history.
      const queue = [...state.queue.slice(0, state.index), ...state.queue.slice(state.index + 1)]
      return { ...state, queue, revealed: false }
    }
    case 'undo': {
      const last = state.history.at(-1)
      if (!last) return state
      const queue = last.requeued ? state.queue.slice(0, -1) : state.queue
      return {
        ...state,
        queue,
        index: state.index - 1,
        revealed: true,
        history: state.history.slice(0, -1),
      }
    }
  }
}

export const GRADE_LABELS: Record<Grade, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' }
