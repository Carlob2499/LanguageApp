import { useEffect } from 'react'

import { armReminder, setBadge } from '@/app/study/reminders'
import { useSettings } from '@/app/study/settings'
import { useDueCounts } from '@/app/study/useDueCounts'
import { db } from '@/db'

/**
 * Keeps the app badge and the local reminder in step with the due count. Lazy-loaded by the
 * shell after the first paint so Dexie stays out of the entry bundle.
 */
export function Pulse() {
  const reminder = useSettings((s) => s.settings.reminder)
  const counts = useDueCounts()
  const due = counts?.due ?? 0
  useEffect(() => setBadge(due), [due])
  useEffect(
    () =>
      armReminder(reminder, () =>
        db.cards
          .where('due')
          .belowOrEqual(Date.now())
          .and((c) => c.state !== 'new' && !c.suspended)
          .count(),
      ),
    [reminder],
  )
  return null
}

export default Pulse
