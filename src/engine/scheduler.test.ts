import { describe, expect, it } from 'vitest'

import { Scheduler } from './scheduler'

const DAY = 24 * 60 * 60 * 1000
const t0 = Date.UTC(2026, 9, 6, 9, 0, 0)

describe('Scheduler (FSRS-6 via ts-fsrs)', () => {
  it('creates a new card due now', () => {
    const s = new Scheduler()
    const card = s.newCard('v:1', 'meaning', 'N5', t0)
    expect(card.key).toBe('v:1|meaning')
    expect(card.state).toBe('new')
    expect(card.due).toBe(t0)
    expect(card.introducedAt).toBeNull()
  })

  it('schedules Good further out than Again and records the review', () => {
    const s = new Scheduler()
    const fresh = s.newCard('v:1', 'meaning', 'N5', t0)
    const good = s.review(fresh, 3, t0)
    const again = s.review(fresh, 1, t0)
    expect(good.card.due).toBeGreaterThan(again.card.due)
    expect(good.card.reps).toBe(1)
    expect(good.card.introducedAt).toBe(t0)
    expect(good.record.grade).toBe(3)
    expect(good.record.reviewedAt).toBe(t0)
    expect(good.record.previous.state).toBe('new')
    expect(good.record.next.state).toBe('learning')
  })

  it('grows intervals across successful reviews', () => {
    const s = new Scheduler()
    let card = s.newCard('k:日', 'meaning', 'N5', t0)
    let now = t0
    const intervals: number[] = []
    for (let i = 0; i < 5; i++) {
      now = Math.max(now, card.due)
      card = s.review(card, 3, now).card
      intervals.push(card.scheduledDays)
    }
    expect(card.state).toBe('review')
    expect(intervals.at(-1)!).toBeGreaterThan(intervals[1]!)
    expect(card.due - now).toBeGreaterThan(7 * DAY)
  })

  it('undo restores the previous card exactly', () => {
    const s = new Scheduler()
    const fresh = s.newCard('v:2', 'reading', 'N5', t0)
    const first = s.review(fresh, 3, t0)
    const second = s.review(first.card, 1, t0 + DAY)
    const undone = s.undo(second.card, second.record)
    expect(undone).toEqual(first.card)
    const undoneAll = s.undo(undone, first.record)
    expect(undoneAll).toEqual(fresh)
    expect(() => s.undo(undone, { ...first.record, key: 'other|reading' })).toThrow()
  })

  it('retrievability decays over time', () => {
    const s = new Scheduler()
    const reviewed = s.review(s.newCard('v:3', 'meaning', 'N5', t0), 3, t0).card
    const soon = s.retrievability(reviewed, t0 + DAY)
    const later = s.retrievability(reviewed, t0 + 30 * DAY)
    expect(soon).toBeGreaterThan(later)
    expect(s.retrievability(s.newCard('v:4', 'meaning', 'N5', t0), t0)).toBe(1)
  })

  it('exposes the retention setting', () => {
    expect(new Scheduler({ desiredRetention: 0.85 }).parameters.request_retention).toBe(0.85)
  })
})
