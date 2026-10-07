import type { DayStatRow, NoteRow, ReviewRow, SettingRow } from '@/db'
import type { StudyCard } from '@/engine/types'

/** Everything a device knows, as plain rows. Version 1 of the snapshot format. */
export interface Snapshot {
  v: 1
  exportedAt: number
  cards: StudyCard[]
  reviews: ReviewRow[]
  days: DayStatRow[]
  settings: SettingRow[]
  notes: NoteRow[]
}

const DEVICE_SETTINGS = new Set([
  'session',
  'sync',
  'theme',
  'jaTextScale',
  'reminder',
  'autoAudio',
  'sound',
  'motion',
  'typing',
])

function newerCard(a: StudyCard, b: StudyCard): StudyCard {
  const la = Math.max(a.lastReview ?? 0, a.modifiedAt ?? 0)
  const lb = Math.max(b.lastReview ?? 0, b.modifiedAt ?? 0)
  if (la !== lb) return la > lb ? a : b
  return a.reps >= b.reps ? a : b
}

/**
 * Two snapshots become one without losing a review from either device: cards keep whichever
 * side studied them last, review logs are unioned, daily counters take the larger value, notes
 * keep the latest edit. Device-specific settings (theme, text size, reminder time, the session
 * in progress, sync state) stay local; the rest follows the newer snapshot.
 */
export function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
  const cards = new Map<string, StudyCard>()
  for (const c of [...remote.cards, ...local.cards]) {
    const prev = cards.get(c.key)
    cards.set(c.key, prev ? newerCard(prev, c) : c)
  }

  const reviews = new Map<string, ReviewRow>()
  for (const r of [...remote.reviews, ...local.reviews]) {
    const rest = { ...r }
    delete rest.id
    reviews.set(`${r.key}|${r.reviewedAt}`, rest)
  }

  const days = new Map<string, DayStatRow>()
  for (const d of [...remote.days, ...local.days]) {
    const prev = days.get(d.day)
    days.set(
      d.day,
      prev
        ? {
            day: d.day,
            newIntroduced: Math.max(prev.newIntroduced, d.newIntroduced),
            reviewsDone: Math.max(prev.reviewsDone, d.reviewsDone),
            timeMs: Math.max(prev.timeMs, d.timeMs),
          }
        : d,
    )
  }

  // Per key, the most recently changed side wins; rows without a time fall back to the newer
  // snapshot. Device-specific keys always stay as they are on this device.
  const settings = new Map<string, SettingRow>()
  const remoteNewer = remote.exportedAt > local.exportedAt
  const stamp = (r: SettingRow, fromRemote: boolean) =>
    r.updatedAt ?? (fromRemote === remoteNewer ? 1 : 0)
  const candidates: Array<[SettingRow, boolean]> = [
    ...remote.settings.map((r): [SettingRow, boolean] => [r, true]),
    ...local.settings.map((r): [SettingRow, boolean] => [r, false]),
  ]
  const best = new Map<string, [SettingRow, number]>()
  for (const [row, fromRemote] of candidates) {
    if (DEVICE_SETTINGS.has(row.key)) continue
    const t = stamp(row, fromRemote)
    const prev = best.get(row.key)
    if (!prev || t > prev[1] || (t === prev[1] && !fromRemote)) best.set(row.key, [row, t])
  }
  for (const [key, [row]] of best) settings.set(key, row)
  for (const s of local.settings) if (DEVICE_SETTINGS.has(s.key)) settings.set(s.key, s)

  const notes = new Map<string, NoteRow>()
  for (const n of [...remote.notes, ...local.notes]) {
    const prev = notes.get(n.itemId)
    if (!prev || n.updatedAt >= prev.updatedAt) notes.set(n.itemId, n)
  }

  return {
    v: 1,
    exportedAt: Math.max(local.exportedAt, remote.exportedAt),
    cards: [...cards.values()],
    reviews: [...reviews.values()].sort((a, b) => a.reviewedAt - b.reviewedAt),
    days: [...days.values()].sort((a, b) => a.day.localeCompare(b.day)),
    settings: [...settings.values()],
    notes: [...notes.values()],
  }
}

export function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<Snapshot>
  return (
    v.v === 1 &&
    typeof v.exportedAt === 'number' &&
    Array.isArray(v.cards) &&
    Array.isArray(v.reviews) &&
    Array.isArray(v.days) &&
    Array.isArray(v.settings) &&
    Array.isArray(v.notes)
  )
}
