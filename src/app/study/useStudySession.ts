import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { db, localDay, withReopen } from '@/db'
import { buildQueue } from '@/engine/queue'
import { Scheduler } from '@/engine/scheduler'
import {
  createSession,
  currentCard,
  isComplete,
  progress,
  reduceSession,
  type SessionState,
} from '@/engine/session'
import type { Grade, StudyCard } from '@/engine/types'

import { loadLibrary, type LevelLibrary } from './library'
import { useSettings } from './settings'

/** Cards that come due within this window are shown again in the same session. */
const SESSION_WINDOW_MS = 30 * 60 * 1000
/** A saved session older than this starts fresh. */
const RESUME_MAX_AGE_MS = 12 * 60 * 60 * 1000

interface SavedSession {
  keys: string[]
  index: number
  startedAt: number
  level: string
}

type Verdict = 'right' | 'wrong'

export interface StudySession {
  status: 'loading' | 'ready' | 'empty' | 'error'
  error?: string
  library?: LevelLibrary
  card?: StudyCard
  revealed: boolean
  /** Result of a typed answer, cleared on the next card. */
  verdict?: Verdict
  /** Grade a typed answer implies (Good when right, Again when wrong); Enter accepts it. */
  suggestedGrade?: Grade
  canUndo: boolean
  done: number
  total: number
  complete: boolean
  reveal: () => void
  /** Reveals the answer with a verdict from a typed response. */
  answer: (verdict: Verdict) => void
  grade: (grade: Grade) => Promise<void>
  undo: () => Promise<void>
}

async function readTodayCounts(now: number) {
  const row = await db.days.get(localDay(now))
  return { newIntroduced: row?.newIntroduced ?? 0, reviewsDone: row?.reviewsDone ?? 0 }
}

async function saveSession(value: SavedSession) {
  await db.settings.put({ key: 'session', value })
}

export function useStudySession(): StudySession {
  const settings = useSettings((s) => s.settings)
  const [status, setStatus] = useState<StudySession['status']>('loading')
  const [error, setError] = useState<string>()
  const [library, setLibrary] = useState<LevelLibrary>()
  const [state, setState] = useState<SessionState>(() => createSession([], 0))
  const [verdict, setVerdict] = useState<Verdict>()
  const scheduler = useMemo(
    () => new Scheduler({ desiredRetention: settings.desiredRetention }),
    [settings.desiredRetention],
  )
  const shownAt = useRef<number>(0)
  // Every transition goes through the callbacks below, which keep this ref current so a queued
  // call never acts on a stale closure.
  const stateRef = useRef(state)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const now = Date.now()
        const lib = await loadLibrary(settings.level, now)
        const existing = await withReopen(() => db.cards.toArray())
        const byKey = new Map(existing.map((c) => [c.key, c]))
        const saved = (await db.settings.get('session'))?.value as SavedSession | undefined
        let session: SessionState
        if (
          saved &&
          saved.level === settings.level &&
          now - saved.startedAt < RESUME_MAX_AGE_MS &&
          saved.index < saved.keys.length
        ) {
          const candidateByKey = new Map(lib.candidates.map((c) => [c.key, c]))
          const queue = saved.keys
            .map((k) => byKey.get(k) ?? candidateByKey.get(k))
            .filter((c): c is StudyCard => Boolean(c))
          session = {
            ...createSession(queue, saved.startedAt),
            index: Math.min(saved.index, queue.length),
          }
        } else {
          const candidates = lib.candidates.filter((c) => !byKey.has(c.key))
          const queue = buildQueue({
            cards: existing,
            candidates,
            settings: {
              newPerDay: settings.newPerDay,
              maxReviews: settings.maxReviews,
              backlogGate: settings.backlogGate,
            },
            today: await readTodayCounts(now),
            now,
          })
          session = createSession(queue, now)
          await saveSession({
            keys: queue.map((c) => c.key),
            index: 0,
            startedAt: now,
            level: settings.level,
          })
        }
        if (cancelled) return
        stateRef.current = session
        setLibrary(lib)
        setState(session)
        setStatus(session.queue.length === 0 ? 'empty' : 'ready')
        shownAt.current = Date.now()
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [settings.level, settings.newPerDay, settings.maxReviews, settings.backlogGate])

  const persistIndex = useCallback(async (next: SessionState) => {
    const saved = (await db.settings.get('session'))?.value as SavedSession | undefined
    if (!saved) return
    await saveSession({ ...saved, keys: next.queue.map((c) => c.key), index: next.index })
  }, [])

  const reveal = useCallback(() => {
    const next = reduceSession(stateRef.current, { type: 'reveal' })
    stateRef.current = next
    setState(next)
  }, [])

  const answer = useCallback((v: Verdict) => {
    setVerdict(v)
    const next = reduceSession(stateRef.current, { type: 'reveal' })
    stateRef.current = next
    setState(next)
  }, [])

  const grade = useCallback(
    async (g: Grade) => {
      const current = stateRef.current
      const before = currentCard(current)
      if (!before || isComplete(current) || !current.revealed) return
      const now = Date.now()
      const { card, record } = scheduler.review(before, g, now)
      record.durationMs = Math.min(60_000, Math.max(0, now - shownAt.current))
      const next = reduceSession(current, {
        type: 'graded',
        before,
        after: card,
        record,
        now,
        sessionWindowMs: SESSION_WINDOW_MS,
      })
      stateRef.current = next
      setState(next)
      setVerdict(undefined)
      shownAt.current = now
      await withReopen(() =>
        db.transaction('rw', db.cards, db.reviews, db.days, db.settings, async () => {
          await db.cards.put(card)
          await db.reviews.add(record)
          const day = localDay(now)
          const row = (await db.days.get(day)) ?? {
            day,
            newIntroduced: 0,
            reviewsDone: 0,
            timeMs: 0,
          }
          row.reviewsDone += 1
          row.timeMs += record.durationMs ?? 0
          if (before.state === 'new') row.newIntroduced += 1
          await db.days.put(row)
          await persistIndex(next)
        }),
      )
    },
    [persistIndex, scheduler],
  )

  const undo = useCallback(async () => {
    const current = stateRef.current
    const last = current.history.at(-1)
    if (!last) return
    const restored = scheduler.undo(last.after, last.record)
    const next = reduceSession(current, { type: 'undo' })
    stateRef.current = next
    setState(next)
    setVerdict(undefined)
    shownAt.current = Date.now()
    await withReopen(() =>
      db.transaction('rw', db.cards, db.reviews, db.days, db.settings, async () => {
        if (restored.state === 'new' && restored.reps === 0) await db.cards.delete(restored.key)
        else await db.cards.put(restored)
        const rows = await db.reviews.where('key').equals(last.record.key).toArray()
        const match = rows.find((r) => r.reviewedAt === last.record.reviewedAt)
        if (match?.id !== undefined) await db.reviews.delete(match.id)
        const day = localDay(last.record.reviewedAt)
        const row = await db.days.get(day)
        if (row) {
          row.reviewsDone = Math.max(0, row.reviewsDone - 1)
          row.timeMs = Math.max(0, row.timeMs - (last.record.durationMs ?? 0))
          if (last.before.state === 'new') row.newIntroduced = Math.max(0, row.newIntroduced - 1)
          await db.days.put(row)
        }
        await persistIndex(next)
      }),
    )
  }, [persistIndex, scheduler])

  useEffect(() => {
    if (status === 'ready' && isComplete(state)) void db.settings.delete('session')
  }, [state, status])

  const { done, total } = progress(state)
  const card = currentCard(state)
  return {
    status,
    revealed: state.revealed,
    canUndo: state.history.length > 0,
    done,
    total,
    complete: status === 'ready' && isComplete(state),
    reveal,
    answer,
    grade,
    undo,
    ...(error === undefined ? {} : { error }),
    ...(library ? { library } : {}),
    ...(card ? { card } : {}),
    ...(verdict === undefined ? {} : { verdict, suggestedGrade: verdict === 'right' ? 3 : 1 }),
  }
}
