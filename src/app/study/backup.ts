import { exportDB, importInto } from 'dexie-export-import'

import { db } from '@/db'

const FILE_PREFIX = 'kintsugi-progress'

/** Everything in the database as one JSON file: cards, reviews, settings, daily stats. */
export async function exportProgress(): Promise<File> {
  const blob = await exportDB(db, { prettyJson: false })
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
export async function restoreProgress(file: File): Promise<RestoreSummary> {
  await importInto(db, file, { clearTablesBeforeImport: true, acceptVersionDiff: true })
  const [cards, reviews] = await Promise.all([db.cards.count(), db.reviews.count()])
  return { cards, reviews }
}
