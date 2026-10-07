import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/app/components/Button'
import { cue, fx } from '@/app/motion/bus'
import { useNavigate } from '@/app/router/index'
import { useSettings } from '@/app/study/settings'
import { requestPersistentStorage } from '@/app/study/storage'
import {
  answerPlacement,
  LEVELS_COUNT,
  MAX_QUESTIONS,
  meter,
  nextLevel,
  progress,
  startLevelIndex,
  startPlacement,
  type PlacementState,
} from '@/engine/placement'
import { LEVELS, type Level } from '@/packs/ja/levels'
import { loadVocab } from '@/packs/ja/loader'
import { buildQuestion, usable, type Question } from '@/packs/ja/placement'
import type { VocabItem } from '@/packs/ja/types'

import styles from './Placement.module.css'

/** Ms the chosen answer stays lit before the next question: long enough to register, short enough to flow. */
const SETTLE_MS = 280

/** The five levels with a marker that slides to the current estimate. */
function Ladder({ at, final = false }: { at: number; final?: boolean }) {
  // Ability 0..5 maps to the gap before N5 .. past N1; the marker rests on the level to start at.
  const pos = Math.min(LEVELS_COUNT - 1, Math.max(0, at))
  return (
    <div
      className={styles.ladder}
      role="img"
      aria-label={`Your level so far: around ${LEVELS[Math.round(pos)]}`}
    >
      <ol className={styles.rungs} aria-hidden="true">
        {LEVELS.map((l, i) => (
          <li key={l} className={styles.rung} data-passed={i < pos - 0.25 ? 'true' : undefined}>
            {l}
          </li>
        ))}
      </ol>
      <span
        className={styles.marker}
        data-final={final ? 'true' : undefined}
        style={{ left: `${((pos + 0.5) / LEVELS_COUNT) * 100}%` }}
        aria-hidden="true"
      />
    </div>
  )
}

function useQuestions() {
  const pools = useRef(new Map<number, VocabItem[]>())
  const used = useRef(new Set<string>())
  const count = useRef(0)

  const pool = useCallback(async (level: number) => {
    const cached = pools.current.get(level)
    if (cached) return cached
    const words = (await loadVocab(LEVELS[level]!)).filter(usable)
    pools.current.set(level, words)
    return words
  }, [])

  const next = useCallback(
    async (level: number): Promise<Question> => {
      // Alternate meaning and reading questions so the test covers both.
      const first = count.current % 2 === 0 ? 'meaning' : 'reading'
      const kinds =
        first === 'meaning' ? (['meaning', 'reading'] as const) : (['reading', 'meaning'] as const)
      // If a level cannot supply a question, look one level down, then one up.
      for (const lv of [level, level - 1, level + 1, 0]) {
        if (lv < 0 || lv >= LEVELS_COUNT) continue
        const words = await pool(lv)
        const fresh = words.filter((w) => !used.current.has(w.id))
        for (const kind of kinds) {
          for (let tries = 0; tries < 40 && fresh.length > 0; tries++) {
            const word = fresh[Math.floor(Math.random() * fresh.length)]!
            const q = buildQuestion(word, words, kind, lv)
            if (q) {
              used.current.add(word.id)
              count.current += 1
              return q
            }
          }
        }
      }
      throw new Error('No placement question could be built')
    },
    [pool],
  )

  /** Fetch the neighbouring levels in the background so later questions appear at once. */
  const warm = useCallback(() => {
    for (const lv of [0, 1, 2, 3, 4]) void pool(lv)
  }, [pool])

  return { next, warm }
}

/** An adaptive placement test: up to 20 checked questions, level by level. */
export function PlacementRoute() {
  const navigate = useNavigate()
  const update = useSettings((s) => s.update)
  const { next, warm } = useQuestions()
  const [state, setState] = useState<PlacementState>(startPlacement)
  const [question, setQuestion] = useState<Question>()
  const [picked, setPicked] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [chosen, setChosen] = useState<Level>()
  const busy = useRef(false)

  const load = useCallback(
    async (s: PlacementState) => {
      try {
        setQuestion(await next(nextLevel(s)))
        setPicked(undefined)
      } catch {
        setFailed(true)
      }
    },
    [next],
  )

  useEffect(() => {
    let cancelled = false
    next(nextLevel(startPlacement()))
      .then((q) => {
        if (!cancelled) setQuestion(q)
        warm()
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [next, warm])

  const answer = useCallback(
    (optionId: string | undefined) => {
      if (!question || busy.current || state.done) return
      busy.current = true
      setPicked(optionId ?? 'unsure')
      cue('koto', state.answers.length)
      const correct = optionId !== undefined && optionId === question.correctId
      window.setTimeout(() => {
        const after = answerPlacement(state, question.level, correct)
        setState(after)
        if (after.done) {
          busy.current = false
          return
        }
        void load(after).then(() => {
          busy.current = false
        })
      }, SETTLE_MS)
    },
    [question, state, load],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!question || e.metaKey || e.ctrlKey || e.altKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= question.options.length) answer(question.options[n - 1]!.id)
      else if (e.key === '5' || e.key.toLowerCase() === 'n') answer(undefined)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [question, answer])

  const estimate = state.done ? LEVELS[startLevelIndex(state)]! : undefined
  const resultRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!estimate) return
    const r = resultRef.current?.getBoundingClientRect()
    fx({ kind: 'seal', x: r ? r.right - 40 : window.innerWidth * 0.75, y: r ? r.top + 30 : 160 })
    cue('seal', 3)
  }, [estimate])

  const bar = useMemo(() => {
    const { done } = progress(state)
    return Array.from({ length: MAX_QUESTIONS }, (_, i) => i < done)
  }, [state])

  async function finish(level: Level) {
    await update({ level, placedAt: estimate ?? level, onboarded: true, kanaReady: true })
    void requestPersistentStorage()
    navigate('/')
  }

  if (failed) {
    return (
      <section className={styles.placement} role="alert">
        <h1>The test could not start</h1>
        <p className={styles.lede}>
          The word lists did not load. Check your connection and try again, or pick a level
          yourself.
        </p>
        <div className={styles.row}>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button variant="quiet" onClick={() => navigate('/welcome')}>
            Pick a level myself
          </Button>
        </div>
      </section>
    )
  }

  if (state.done && estimate) {
    const level = chosen ?? estimate
    return (
      <section className={styles.placement} aria-labelledby="placement-title">
        <p className={styles.eyebrow}>Placement</p>
        <h1 id="placement-title" className={styles.resultTitle}>
          Start around <span className={styles.level}>{estimate}</span>.
        </h1>
        <div ref={resultRef} className={styles.resultLadder}>
          <Ladder at={startLevelIndex(state)} final />
        </div>
        <p className={styles.lede}>
          That is an estimate from {state.answers.length} answers, not a certificate. Pick where you
          want to begin; you can change it in Settings any time.
        </p>
        <div className={styles.levels} role="radiogroup" aria-label="Starting level">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              className={styles.levelOption}
              onClick={() => {
                setChosen(l)
                cue('tap')
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <Button variant="primary" size="large" onClick={() => void finish(level)}>
          Begin at {level}
        </Button>
      </section>
    )
  }

  const { done } = progress(state)
  return (
    <section className={styles.placement} aria-labelledby="placement-title">
      <header className={styles.top}>
        <p className={styles.eyebrow}>Placement</p>
        <p className={styles.counter} aria-live="polite">
          {Math.min(done + 1, MAX_QUESTIONS)} of up to {MAX_QUESTIONS}
        </p>
      </header>
      <div
        className={styles.beads}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={MAX_QUESTIONS}
        aria-valuenow={done}
        aria-label="Placement progress"
      >
        {bar.map((on, i) => (
          <i key={i} data-on={on ? 'true' : undefined} data-now={i === done ? 'true' : undefined} />
        ))}
      </div>
      <Ladder at={meter(state)} />
      {!question ? (
        <p className={styles.muted} role="status">
          Setting up the test…
        </p>
      ) : (
        <div className={styles.card} key={question.id}>
          <h1 id="placement-title" className={styles.question}>
            {question.kind === 'meaning' ? 'What does this word mean?' : 'How is this word read?'}
          </h1>
          <p className={`${styles.word} ja-display`} lang="ja">
            {question.form}
          </p>
          <div className={styles.options} role="group" aria-label="Choose an answer">
            {question.options.map((o, i) => (
              <button
                key={o.id}
                type="button"
                className={styles.option}
                data-picked={picked === o.id ? 'true' : undefined}
                disabled={picked !== undefined}
                lang={question.kind === 'reading' ? 'ja' : 'en'}
                onClick={() => answer(o.id)}
              >
                <kbd className={styles.kbd} aria-hidden="true">
                  {i + 1}
                </kbd>
                <span>{o.text}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.unsure}
            data-picked={picked === 'unsure' ? 'true' : undefined}
            disabled={picked !== undefined}
            onClick={() => answer(undefined)}
          >
            Not sure
            <kbd className={styles.kbdSmall} aria-hidden="true">
              5
            </kbd>
          </button>
        </div>
      )}
    </section>
  )
}
