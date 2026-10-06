import { describe, expect, it } from 'vitest'

import { buildQueue } from './queue'
import { Scheduler } from './scheduler'
import type { StudyCard } from './types'

const t0 = Date.UTC(2026, 9, 6, 9, 0, 0)
const s = new Scheduler()
const settings = { newPerDay: 5, maxReviews: 100, backlogGate: 50 }

function reviewed(id: string, dueOffsetMs: number): StudyCard {
  const card = s.review(
    s.newCard(id, 'meaning', 'N5', t0 - 10 * 86_400_000),
    3,
    t0 - 10 * 86_400_000,
  ).card
  return { ...card, due: t0 + dueOffsetMs }
}
const fresh = (n: number) =>
  Array.from({ length: n }, (_, i) => s.newCard(`n:${i}`, 'meaning', 'N5', t0))

describe('buildQueue', () => {
  it('returns overdue reviews most-overdue first and excludes future cards', () => {
    const cards = [reviewed('a', -1000), reviewed('b', -5000), reviewed('c', +60_000)]
    const q = buildQueue({
      cards,
      candidates: [],
      settings,
      today: { newIntroduced: 0, reviewsDone: 0 },
      now: t0,
    })
    expect(q.map((c) => c.itemId)).toEqual(['b', 'a'])
  })

  it('weaves the daily new allowance into the reviews', () => {
    const cards = Array.from({ length: 10 }, (_, i) => reviewed(`r${i}`, -i * 1000))
    const q = buildQueue({
      cards,
      candidates: fresh(8),
      settings,
      today: { newIntroduced: 2, reviewsDone: 0 },
      now: t0,
    })
    const news = q.filter((c) => c.state === 'new')
    expect(news).toHaveLength(3)
    expect(q[0]!.state).not.toBe('new')
    expect(q.findIndex((c) => c.state === 'new')).toBeLessThan(q.length - 1)
  })

  it('stops new cards when the backlog is above the gate', () => {
    const cards = Array.from({ length: 60 }, (_, i) => reviewed(`r${i}`, -i * 1000))
    const q = buildQueue({
      cards,
      candidates: fresh(5),
      settings,
      today: { newIntroduced: 0, reviewsDone: 0 },
      now: t0,
    })
    expect(q.some((c) => c.state === 'new')).toBe(false)
  })

  it('respects the session review cap', () => {
    const cards = Array.from({ length: 30 }, (_, i) => reviewed(`r${i}`, -i * 1000))
    const q = buildQueue({
      cards,
      candidates: [],
      settings: { ...settings, maxReviews: 20 },
      today: { newIntroduced: 0, reviewsDone: 5 },
      now: t0,
    })
    expect(q).toHaveLength(15)
  })

  it('gives only new cards on a fresh account', () => {
    const q = buildQueue({
      cards: [],
      candidates: fresh(9),
      settings,
      today: { newIntroduced: 0, reviewsDone: 0 },
      now: t0,
    })
    expect(q).toHaveLength(5)
  })
})
