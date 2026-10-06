import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type FSRS,
  type FSRSParameters,
  type Grade as FsrsGrade,
} from 'ts-fsrs'

import type { CardState, Grade, ReviewRecord, SchedulingSnapshot, StudyCard } from './types'

export interface SchedulerOptions {
  /** Target probability of recall at review time. Default 0.9. */
  desiredRetention?: number
  /** Deterministic fuzz off by default so tests are reproducible. */
  fuzz?: boolean
}

const STATE_TO: Record<State, CardState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
}
const STATE_FROM: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
}
const GRADE_TO_RATING: Record<Grade, FsrsGrade> = {
  1: Rating.Again,
  2: Rating.Hard,
  3: Rating.Good,
  4: Rating.Easy,
}

function toFsrs(card: StudyCard): Card {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_FROM[card.state],
    ...(card.lastReview === null ? {} : { last_review: new Date(card.lastReview) }),
  }
}

function fromFsrs(card: StudyCard, next: Card): StudyCard {
  return {
    ...card,
    state: STATE_TO[next.state],
    due: next.due.getTime(),
    stability: next.stability,
    difficulty: next.difficulty,
    elapsedDays: next.elapsed_days,
    scheduledDays: next.scheduled_days,
    learningSteps: next.learning_steps,
    reps: next.reps,
    lapses: next.lapses,
    lastReview: next.last_review ? next.last_review.getTime() : null,
  }
}

export function snapshot(card: StudyCard): SchedulingSnapshot {
  return {
    state: card.state,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsedDays,
    scheduledDays: card.scheduledDays,
    learningSteps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.lastReview,
    introducedAt: card.introducedAt,
  }
}

export class Scheduler {
  private readonly engine: FSRS
  readonly parameters: FSRSParameters

  constructor(options: SchedulerOptions = {}) {
    this.parameters = generatorParameters({
      request_retention: options.desiredRetention ?? 0.9,
      enable_fuzz: options.fuzz ?? false,
    })
    this.engine = fsrs(this.parameters)
  }

  /** A fresh card for an item, due now so it can be introduced. */
  newCard(itemId: string, cardType: string, group: string, now: number): StudyCard {
    const base = createEmptyCard(new Date(now))
    return fromFsrs(
      {
        key: `${itemId}|${cardType}`,
        itemId,
        cardType,
        group,
        state: 'new',
        due: now,
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        learningSteps: 0,
        reps: 0,
        lapses: 0,
        lastReview: null,
        introducedAt: null,
      },
      base,
    )
  }

  /** Applies a grade and returns the updated card plus a record that can undo it. */
  review(card: StudyCard, grade: Grade, now: number): { card: StudyCard; record: ReviewRecord } {
    const { card: next } = this.engine.next(toFsrs(card), new Date(now), GRADE_TO_RATING[grade])
    const updated = fromFsrs(card, next)
    updated.introducedAt ??= now
    const record: ReviewRecord = {
      key: card.key,
      grade,
      reviewedAt: now,
      previous: snapshot(card),
      next: snapshot(updated),
    }
    return { card: updated, record }
  }

  /** Reverses a review exactly, from the snapshot stored in its record. */
  undo(card: StudyCard, record: ReviewRecord): StudyCard {
    if (record.key !== card.key)
      throw new Error(`record ${record.key} does not belong to card ${card.key}`)
    return { ...card, ...record.previous }
  }

  /** Probability of recall right now, 0..1 (1 for cards never reviewed). */
  retrievability(card: StudyCard, now: number): number {
    if (card.state === 'new') return 1
    const r = this.engine.get_retrievability(toFsrs(card), new Date(now), false)
    return typeof r === 'number' ? r : Number.parseFloat(String(r))
  }
}
