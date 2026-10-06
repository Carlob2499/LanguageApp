import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'

import { db, localDay } from '@/db'

export interface DueCounts {
  due: number
  learned: number
  today: { reviewsDone: number; newIntroduced: number }
}

/** Live counts for the Today screen; re-renders when the database changes and once a minute. */
export function useDueCounts(): DueCounts | undefined {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return useLiveQuery(async () => {
    const now = Date.now()
    const [due, learned, today] = await Promise.all([
      db.cards
        .where('due')
        .belowOrEqual(now)
        .and((c) => c.state !== 'new')
        .count(),
      db.cards.count(),
      db.days.get(localDay(now)),
    ])
    return {
      due,
      learned,
      today: { reviewsDone: today?.reviewsDone ?? 0, newIntroduced: today?.newIntroduced ?? 0 },
    }
  }, [tick])
}
