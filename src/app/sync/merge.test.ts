import { describe, expect, it } from 'vitest'

import type { StudyCard } from '@/engine/types'

import { isSnapshot, mergeSnapshots, type Snapshot } from './merge'

function card(key: string, lastReview: number | null, reps = 1): StudyCard {
  return {
    key,
    itemId: key.split('|')[0]!,
    cardType: 'kanji-meaning',
    group: 'N5',
    state: lastReview ? 'review' : 'new',
    due: 0,
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps,
    lapses: 0,
    lastReview,
    introducedAt: lastReview,
  }
}

const base: Snapshot = {
  v: 1,
  exportedAt: 1000,
  cards: [],
  reviews: [],
  days: [],
  settings: [],
  notes: [],
}

describe('mergeSnapshots', () => {
  it('keeps the card studied last, unions reviews, and takes the larger day counters', () => {
    const local: Snapshot = {
      ...base,
      exportedAt: 2000,
      cards: [card('k:日|m', 500), card('k:月|m', 900)],
      reviews: [
        { key: 'k:日|m', grade: 3, reviewedAt: 500, previous: {} as never, next: {} as never },
      ],
      days: [{ day: '2026-10-06', newIntroduced: 2, reviewsDone: 5, timeMs: 1000 }],
    }
    const remote: Snapshot = {
      ...base,
      exportedAt: 1500,
      cards: [card('k:日|m', 800, 2), card('k:火|m', null)],
      reviews: [
        {
          id: 7,
          key: 'k:日|m',
          grade: 1,
          reviewedAt: 800,
          previous: {} as never,
          next: {} as never,
        },
        {
          id: 8,
          key: 'k:日|m',
          grade: 3,
          reviewedAt: 500,
          previous: {} as never,
          next: {} as never,
        },
      ],
      days: [{ day: '2026-10-06', newIntroduced: 1, reviewsDone: 9, timeMs: 400 }],
    }
    const merged = mergeSnapshots(local, remote)
    expect(merged.cards.map((c) => [c.key, c.lastReview])).toEqual(
      expect.arrayContaining([
        ['k:日|m', 800],
        ['k:月|m', 900],
        ['k:火|m', null],
      ]),
    )
    expect(merged.reviews).toHaveLength(2)
    expect(merged.reviews.every((r) => !('id' in r))).toBe(true)
    expect(merged.days).toEqual([
      { day: '2026-10-06', newIntroduced: 2, reviewsDone: 9, timeMs: 1000 },
    ])
    expect(merged.exportedAt).toBe(2000)
  })

  it('keeps device settings local and follows the newer snapshot for the rest', () => {
    const local: Snapshot = {
      ...base,
      exportedAt: 1000,
      settings: [
        { key: 'theme', value: 'light' },
        { key: 'level', value: 'N5' },
      ],
      notes: [{ itemId: 'k:日', text: 'old', updatedAt: 1 }],
    }
    const remote: Snapshot = {
      ...base,
      exportedAt: 3000,
      settings: [
        { key: 'theme', value: 'dark' },
        { key: 'level', value: 'N3' },
        { key: 'sync', value: 'remote-secret' },
      ],
      notes: [{ itemId: 'k:日', text: 'new', updatedAt: 2 }],
    }
    const merged = mergeSnapshots(local, remote)
    const map = Object.fromEntries(merged.settings.map((s) => [s.key, s.value]))
    expect(map).toEqual({ theme: 'light', level: 'N3' })
    expect(merged.notes).toEqual([{ itemId: 'k:日', text: 'new', updatedAt: 2 }])
  })

  it('recognises its own format and nothing else', () => {
    expect(isSnapshot(base)).toBe(true)
    expect(isSnapshot({ v: 2 })).toBe(false)
    expect(isSnapshot('nope')).toBe(false)
  })

  it('lets the most recent edit of each setting win, whichever device made it', () => {
    const local: Snapshot = {
      ...base,
      exportedAt: 5000,
      settings: [
        { key: 'newPerDay', value: 10, updatedAt: 100 },
        { key: 'level', value: 'N4', updatedAt: 900 },
      ],
    }
    const remote: Snapshot = {
      ...base,
      exportedAt: 1000,
      settings: [
        { key: 'newPerDay', value: 20, updatedAt: 800 },
        { key: 'level', value: 'N5', updatedAt: 200 },
      ],
    }
    const map = Object.fromEntries(
      mergeSnapshots(local, remote).settings.map((s) => [s.key, s.value]),
    )
    expect(map).toEqual({ newPerDay: 20, level: 'N4' })
  })
})
