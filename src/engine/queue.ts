import type { StudyCard } from './types'

export interface QueueSettings {
  /** New cards to introduce per calendar day. */
  newPerDay: number
  /** Hard cap on reviews shown in one session. */
  maxReviews: number
  /** Stop introducing new cards while more than this many reviews are overdue. */
  backlogGate: number
}

export interface DailyCounts {
  newIntroduced: number
  reviewsDone: number
}

export interface QueueInput {
  /** Cards already introduced (state != new). */
  cards: StudyCard[]
  /** Never-seen cards in the order they should be introduced. */
  candidates: StudyCard[]
  settings: QueueSettings
  today: DailyCounts
  now: number
}

/**
 * Builds today's session: due reviews first (most overdue first), with the day's
 * remaining new cards woven in every few reviews so introductions are interleaved
 * rather than dumped at the end.
 */
export function buildQueue(input: QueueInput): StudyCard[] {
  const { cards, candidates, settings, today, now } = input
  const due = cards
    .filter((c) => c.state !== 'new' && c.due <= now)
    .sort((a, b) => a.due - b.due)
    .slice(0, Math.max(0, settings.maxReviews - today.reviewsDone))
  const backlog = cards.filter((c) => c.state !== 'new' && c.due <= now).length
  const newAllowance =
    backlog > settings.backlogGate ? 0 : Math.max(0, settings.newPerDay - today.newIntroduced)
  const fresh = candidates.slice(0, newAllowance)

  if (fresh.length === 0) return due
  if (due.length === 0) return fresh

  const out: StudyCard[] = []
  const stride = Math.max(1, Math.floor(due.length / (fresh.length + 1)))
  let f = 0
  due.forEach((card, i) => {
    out.push(card)
    if ((i + 1) % stride === 0 && f < fresh.length) out.push(fresh[f++]!)
  })
  while (f < fresh.length) out.push(fresh[f++]!)
  return out
}
