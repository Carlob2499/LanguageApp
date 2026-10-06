/** Language-agnostic study engine types. Item contents never enter the engine. */

export type Grade = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy (ts-fsrs Rating order)

export type CardState = 'new' | 'learning' | 'review' | 'relearning'

/** A card key is `${itemId}|${cardType}`; card types are defined by the language profile. */
export type CardKey = string

export interface StudyCard {
  key: CardKey
  itemId: string
  cardType: string
  /** Pack level or group, used for ordering and progress; opaque to the engine. */
  group: string
  state: CardState
  /** Epoch milliseconds. */
  due: number
  stability: number
  difficulty: number
  elapsedDays: number
  scheduledDays: number
  learningSteps: number
  reps: number
  lapses: number
  lastReview: number | null
  /** When the card was first shown. */
  introducedAt: number | null
}

export interface ReviewRecord {
  key: CardKey
  grade: Grade
  reviewedAt: number
  /** The card's scheduling fields before this review, so the review can be undone exactly. */
  previous: SchedulingSnapshot
  /** The card's scheduling fields after this review. */
  next: SchedulingSnapshot
  /** Milliseconds the learner spent on the card, if measured. */
  durationMs?: number
}

export type SchedulingSnapshot = Pick<
  StudyCard,
  | 'state'
  | 'due'
  | 'stability'
  | 'difficulty'
  | 'elapsedDays'
  | 'scheduledDays'
  | 'learningSteps'
  | 'reps'
  | 'lapses'
  | 'lastReview'
  | 'introducedAt'
>
