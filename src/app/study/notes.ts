import { useLiveQuery } from 'dexie-react-hooks'

import { db, withReopen } from '@/db'

/** The learner's memory aid for an item, live from the database; undefined until read. */
export function useNote(itemId: string): string | undefined {
  return useLiveQuery(async () => (await db.notes.get(itemId))?.text ?? '', [itemId])
}

export async function saveNote(itemId: string, text: string): Promise<void> {
  const trimmed = text.trim()
  await withReopen(async () => {
    if (trimmed) await db.notes.put({ itemId, text: trimmed, updatedAt: Date.now() })
    else await db.notes.delete(itemId)
  })
}
