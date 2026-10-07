import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/app/components/Button'
import { Furigana } from '@/app/components/Furigana'
import { useNavigate } from '@/app/router/index'
import { useSettings } from '@/app/study/settings'
import { requestPersistentStorage } from '@/app/study/storage'
import {
  answerPlacement,
  currentItem,
  DEFAULT_PLACEMENT,
  estimateBand,
  progress,
  startPlacement,
  type ItemSource,
  type PlacementItem,
  type PlacementState,
} from '@/engine/placement'
import { displayForm, readingsFor } from '@/packs/ja/cards'
import { LEVELS, type Level } from '@/packs/ja/levels'
import { loadPlacementLures, loadVocab } from '@/packs/ja/loader'

import styles from './Placement.module.css'

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

/** A Yes/No placement test: real words from each level mixed with non-words. */
export function PlacementRoute() {
  const navigate = useNavigate()
  const update = useSettings((s) => s.update)
  const [source, setSource] = useState<ItemSource>()
  const [state, setState] = useState<PlacementState>()
  const [chosen, setChosen] = useState<Level>()

  useEffect(() => {
    let cancelled = false
    void Promise.all([Promise.all(LEVELS.map((l) => loadVocab(l))), loadPlacementLures()]).then(
      ([packs, lures]) => {
        if (cancelled) return
        const pools = packs.map((items) =>
          shuffle(items.filter((v) => v.priority > 0 || items.length < 200)).map<PlacementItem>(
            (v) => {
              const form = displayForm(v)
              return {
                text: form,
                real: true,
                band: LEVELS.indexOf(v.level),
                ...(readingsFor(v, form)[0] ? { hint: readingsFor(v, form)[0]! } : {}),
              }
            },
          ),
        )
        const lurePool = shuffle(
          lures.map<PlacementItem>((l) => ({ text: l.text, real: false, band: -1 })),
        )
        const cursors = pools.map(() => 0)
        let lureCursor = 0
        const src: ItemSource = {
          real: (band, n) => {
            const pool = pools[band] ?? []
            const start = cursors[band] ?? 0
            cursors[band] = start + n
            return pool.slice(start, start + n)
          },
          lure: (n) => {
            const out = lurePool.slice(lureCursor, lureCursor + n)
            lureCursor += n
            return out
          },
          shuffle,
        }
        setSource(src)
        setState(startPlacement(src, DEFAULT_PLACEMENT))
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const estimate = useMemo(() => (state?.done ? LEVELS[estimateBand(state)]! : undefined), [state])

  useEffect(() => {
    if (!state || !source) return
    function onKey(e: KeyboardEvent) {
      if (state!.done) return
      if (e.key === 'y' || e.key === 'ArrowRight') setState(answerPlacement(state!, true, source!))
      if (e.key === 'n' || e.key === 'ArrowLeft') setState(answerPlacement(state!, false, source!))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, source])

  async function finish(level: Level) {
    await update({ level, placedAt: estimate ?? level, onboarded: true, kanaReady: true })
    void requestPersistentStorage()
    navigate('/')
  }

  if (!state || !source) {
    return (
      <p className={styles.muted} role="status">
        Setting up the test…
      </p>
    )
  }

  if (state.done && estimate) {
    const level = chosen ?? estimate
    return (
      <section className={styles.placement} aria-labelledby="placement-title">
        <p className={styles.eyebrow}>Placement</p>
        <h1 id="placement-title">Start around {estimate}.</h1>
        <p className={styles.lede}>
          That is an estimate from {state.scores.length * DEFAULT_PLACEMENT.blockSize} words, not a
          certificate. Pick where you want to begin; you can change it in Settings any time.
        </p>
        <div className={styles.levels} role="radiogroup" aria-label="Starting level">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={level === l}
              className={styles.levelOption}
              onClick={() => setChosen(l)}
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

  const item = currentItem(state)!
  const { done, total } = progress(state)
  return (
    <section className={styles.placement} aria-labelledby="placement-title">
      <p className={styles.eyebrow}>Placement · {LEVELS[state.band]}</p>
      <h1 id="placement-title" className={styles.question}>
        Do you know this word?
      </h1>
      <p className={styles.counter} aria-live="polite">
        {done + 1} of up to {total}
      </p>
      <div className={styles.card} key={`${state.scores.length}-${state.index}`}>
        <p className={`${styles.word} ja-display`} lang="ja">
          {item.hint ? <Furigana text={item.text} reading={item.hint} show="auto" /> : item.text}
        </p>
        <p className={styles.hintNote}>{item.hint ? 'Tap the word for its reading.' : ''}</p>
      </div>
      <p className={styles.warn}>
        Some of these are not real words. Say "know" only when you are sure.
      </p>
      <div className={styles.answers} role="group" aria-label="Your answer">
        <Button
          size="large"
          variant="secondary"
          onClick={() => setState(answerPlacement(state, false, source))}
        >
          Don't know
          <kbd className={styles.kbd}>N</kbd>
        </Button>
        <Button
          size="large"
          variant="primary"
          onClick={() => setState(answerPlacement(state, true, source))}
        >
          Know it
          <kbd className={styles.kbd}>Y</kbd>
        </Button>
      </div>
    </section>
  )
}
