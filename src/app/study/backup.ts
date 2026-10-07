import { exportDB, importInto } from 'dexie-export-import'

import { db } from '@/db'

const FILE_PREFIX = 'kintsugi-progress'
const LOCAL_ONLY = new Set(['sync', 'session'])
/** Far above any real backup (a year of daily reviews is a few MB); refuses runaway files. */
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024

/** Everything in the database as one JSON file: cards, reviews, settings, daily stats. */
export async function exportProgress(): Promise<File> {
  // The sync key and the session in progress belong to this device: a backup file that sits in
  // iCloud or email must not carry the key that unlocks the synced snapshot.
  const blob = await exportDB(db, {
    prettyJson: false,
    filter: (table, value: { key?: string }) =>
      !(table === 'settings' && LOCAL_ONLY.has(value?.key ?? '')),
  })
  const stamp = new Date().toISOString().slice(0, 10)
  return new File([blob], `${FILE_PREFIX}-${stamp}.json`, { type: 'application/json' })
}

/**
 * Hands the file to the share sheet where files can be shared (iOS puts "Save to Files" there),
 * otherwise triggers a download.
 */
export async function saveProgress(): Promise<'shared' | 'downloaded'> {
  const file = await exportProgress()
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Kintsugi progress' })
      return 'shared'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'shared'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

export interface RestoreSummary {
  cards: number
  reviews: number
}

/** Replaces everything on this device with the backup's contents. */
interface BackupShape {
  formatName: string
  data: {
    databaseName: string
    tables: Array<{ name: string }>
    data: Array<{ tableName: string; rows: unknown[] }>
  }
}

const TABLES = new Set(['cards', 'reviews', 'settings', 'days', 'notes'])

function isBackup(v: unknown): v is BackupShape {
  if (typeof v !== 'object' || v === null) return false
  const b = v as Partial<BackupShape>
  if (b.formatName !== 'dexie' || typeof b.data !== 'object' || b.data === null) return false
  if (!Array.isArray(b.data.data)) return false
  return b.data.data.every(
    (t) =>
      typeof t === 'object' &&
      t !== null &&
      TABLES.has(t.tableName) &&
      Array.isArray(t.rows) &&
      t.rows.every((r) => typeof r === 'object' && r !== null && !Array.isArray(r)),
  )
}

export async function restoreProgress(file: File): Promise<RestoreSummary> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('That file is far too large to be a backup.')
  // Read and check the whole file before anything is cleared, so a truncated or foreign file
  // can never leave the device empty.
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('That file is damaged or not a Kintsugi backup.')
  }
  if (!isBackup(parsed)) throw new Error('That file is not a Kintsugi backup.')
  file = new File([JSON.stringify(parsed)], file.name, { type: 'application/json' })
  // Keep this device's sync key and session; never take them from a file.
  const keep = (await db.settings.bulkGet([...LOCAL_ONLY])).filter(
    (r): r is NonNullable<typeof r> => r !== undefined,
  )
  await importInto(db, file, {
    clearTablesBeforeImport: true,
    acceptVersionDiff: true,
    filter: (table, value: { key?: string }) =>
      !(table === 'settings' && LOCAL_ONLY.has(value?.key ?? '')),
  })
  if (keep.length > 0) await db.settings.bulkPut(keep)
  const [cards, reviews] = await Promise.all([db.cards.count(), db.reviews.count()])
  return { cards, reviews }
}
