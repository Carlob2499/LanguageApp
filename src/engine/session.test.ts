import { describe, expect, it } from 'vitest'

import { Scheduler } from './scheduler'
import { createSession, currentCard, isComplete, progress, reduceSession } from './session'
import type { ReviewRecord, StudyCard } from './types'

const t0 = Date.UTC(2026, 9, 6, 9, 0, 0)
const s = new Scheduler()
const WINDOW = 30 * 60 * 1000

describe('session reducer', () => {
  it('walks the queue, re-queues lapses, and undoes the last grade', () => {
    const cards = ['a', 'b'].map((id) => s.newCard(id, 'meaning', 'N5', t0))
    let state = createSession(cards, t0)
    expect(progress(state)).toEqual({ done: 0, total: 2 })

    state = reduceSession(state, { type: 'reveal' })
    expect(state.revealed).toBe(true)

    const first = currentCard(state)!
    const again = s.review(first, 1, t0)
    state = reduceSession(state, {
      type: 'graded',
      before: first,
      after: again.card,
      record: again.record,
      now: t0,
      sessionWindowMs: WINDOW,
    })
    expect(state.queue).toHaveLength(3) // "Again" comes back within the session
    expect(state.index).toBe(1)
    expect(state.revealed).toBe(false)

    state = reduceSession(state, { type: 'undo' })
    expect(state.queue).toHaveLength(2)
    expect(state.index).toBe(0)
    expect(state.revealed).toBe(true)
    expect(state.history).toHaveLength(0)

    const easy = s.review(first, 4, t0)
    state = reduceSession(state, {
      type: 'graded',
      before: first,
      after: easy.card,
      record: easy.record,
      now: t0,
      sessionWindowMs: WINDOW,
    })
    expect(state.queue).toHaveLength(2) // Easy graduates straight to a multi-day interval

    const second = currentCard(state)!
    const good = s.review(second, 3, t0)
    state = reduceSession(state, {
      type: 'graded',
      before: second,
      after: good.card,
      record: good.record,
      now: t0,
      sessionWindowMs: WINDOW,
    })
    expect(state.queue).toHaveLength(3) // Good on a new card returns after the 10-minute learning step
    expect(isComplete(state)).toBe(false)

    const third = currentCard(state)!
    expect(third.key).toBe(second.key)
    const graduated = s.review(third, 4, third.due)
    state = reduceSession(state, {
      type: 'graded',
      before: third,
      after: graduated.card,
      record: graduated.record,
      now: third.due,
      sessionWindowMs: WINDOW,
    })
    expect(isComplete(state)).toBe(true)
    expect(reduceSession(state, { type: 'reveal' })).toBe(state)
  })

  it('ignores undo with empty history', () => {
    const state = createSession([], t0)
    expect(reduceSession(state, { type: 'undo' })).toBe(state)
  })

  it('skips a card without a review, and undo still restores the last graded card', () => {
    const a = { key: 'a' } as StudyCard
    const b = { key: 'b' } as StudyCard
    const c = { key: 'c' } as StudyCard
    let s = createSession([a, b, c], 0)
    s = reduceSession(s, { type: 'reveal' })
    s = reduceSession(s, {
      type: 'graded',
      before: a,
      after: { ...a, due: 10 ** 12 },
      record: { key: 'a' } as ReviewRecord,
      now: 0,
      sessionWindowMs: 0,
    })
    s = reduceSession(s, { type: 'skip' })
    expect(s.queue.map((q) => q.key)).toEqual(['a', 'c'])
    expect(currentCard(s)?.key).toBe('c')
    expect(s.history).toHaveLength(1)
    s = reduceSession(s, { type: 'undo' })
    expect(currentCard(s)?.key).toBe('a')
  })
})
