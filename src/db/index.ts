import Dexie, { type EntityTable } from 'dexie'

import type { ReviewRecord, StudyCard } from '@/engine/types'

export interface SettingRow {
  key: string
  value: unknown
}

export interface DayStatRow {
  /** Local calendar day, YYYY-MM-DD. */
  day: string
  newIntroduced: number
  reviewsDone: number
  /** Milliseconds spent reviewing. */
  timeMs: number
}

export interface ReviewRow extends ReviewRecord {
  id?: number
}

/** A learner's own memory aid for an item. Never pre-filled by the app. */
export interface NoteRow {
  itemId: string
  text: string
  updatedAt: number
}

export class KintsugiDB extends Dexie {
  cards!: EntityTable<StudyCard, 'key'>
  reviews!: EntityTable<ReviewRow, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  days!: EntityTable<DayStatRow, 'day'>
  notes!: EntityTable<NoteRow, 'itemId'>

  constructor(name = 'kintsugi') {
    super(name)
    this.version(1).stores({
      cards: 'key, itemId, state, due, group, [state+due]',
      reviews: '++id, key, reviewedAt',
      settings: 'key',
      days: 'day',
    })
    this.version(2).stores({ notes: 'itemId' })
  }
}

export const db = new KintsugiDB()

/**
 * iOS Safari can close an IndexedDB connection while the app is backgrounded. Wrap writes so a
 * closed connection is reopened once and the operation retried.
 */
export async function withReopen<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (
      error instanceof Dexie.DatabaseClosedError ||
      (error instanceof Error && error.name === 'DatabaseClosedError')
    ) {
      await db.open()
      return operation()
    }
    throw error
  }
}

export function localDay(now: number): string {
  const d = new Date(now)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
