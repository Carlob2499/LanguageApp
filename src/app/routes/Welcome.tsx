import { useEffect, useState } from 'react'

import { Button } from '@/app/components/Button'
import { useNavigate } from '@/app/router/index'
import { useSettings } from '@/app/study/settings'
import { requestPersistentStorage } from '@/app/study/storage'
import { LEVELS, type Level } from '@/packs/ja/levels'
import { strokesFor } from '@/packs/ja/loader'
import type { StrokeItem } from '@/packs/ja/types'

import styles from './Welcome.module.css'
import { WelcomeIntro } from './WelcomeIntro'

const LEVEL_BLURB: Record<Level, string> = {
  N5: 'Starting out. Everyday words and the first 80 kanji.',
  N4: 'Can handle simple conversations. About 170 more kanji.',
  N3: 'Reads everyday material with some effort.',
  N2: 'Comfortable with most texts and news.',
  N1: 'Near-native reading across topics.',
}

export function WelcomeRoute() {
  const navigate = useNavigate()
  const update = useSettings((s) => s.update)
  const [step, setStep] = useState<0 | 'kana' | 1 | 2>(0)
  const [readsKana, setReadsKana] = useState<boolean>()
  const [level, setLevel] = useState<Level>('N5')
  const [newPerDay, setNewPerDay] = useState(10)
  const [gold, setGold] = useState<StrokeItem>()
  const [replay, setReplay] = useState(0)

  // The hero's glyph and tiles mount after the first paint, inside a box of fixed height, so the
  // headline paints first and nothing shifts when the decoration arrives.
  const [showHero, setShowHero] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setShowHero(true), 60)
    void strokesFor('金', 'N5')
      .then((s) => s ?? strokesFor('金', 'N4'))
      .then((s) => setGold(s))
    return () => window.clearTimeout(id)
  }, [])

  async function finish() {
    await update({ onboarded: true, level, newPerDay, kanaReady: true })
    void requestPersistentStorage()
    navigate('/')
  }

  async function finishKanaFirst() {
    await update({ onboarded: true, level: 'N5', newPerDay: 10, kanaReady: false })
    void requestPersistentStorage()
    navigate('/')
  }

  return (
    <section className={styles.welcome} aria-live="polite">
      {step === 0 && (
        <WelcomeIntro
          showHero={showHero}
          gold={gold}
          replay={replay}
          onReplay={() => setReplay((n) => n + 1)}
          onStart={() => setStep('kana')}
        />
      )}
      {step === 'kana' && (
        <>
          <p className={styles.eyebrow}>First question</p>
          <h1>Do you read kana?</h1>
          <p className={styles.lede}>
            Hiragana and katakana, the two syllabaries. Everything here is written with them.
          </p>
          <div className={styles.options} role="radiogroup" aria-label="Do you read kana?">
            <button
              type="button"
              role="radio"
              aria-checked={readsKana === false}
              className={styles.option}
              onClick={() => setReadsKana(false)}
            >
              <span className={styles.optionLevel} lang="ja">
                あ
              </span>
              <span className={styles.optionText}>
                Not yet. Teach me the sounds first; kanji can wait.
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={readsKana === true}
              className={styles.option}
              onClick={() => setReadsKana(true)}
            >
              <span className={styles.optionLevel} lang="ja">
                漢
              </span>
              <span className={styles.optionText}>
                Yes. Place me with a short test, or let me pick a level.
              </span>
            </button>
          </div>
          <div className={styles.buttonRow}>
            {readsKana === false && (
              <Button variant="primary" size="large" onClick={() => void finishKanaFirst()}>
                Begin with kana
              </Button>
            )}
            {readsKana === true && (
              <>
                <Button variant="primary" size="large" onClick={() => navigate('/placement')}>
                  Take the placement test
                </Button>
                <Button variant="quiet" size="large" onClick={() => setStep(1)}>
                  Pick a level myself
                </Button>
              </>
            )}
          </div>
        </>
      )}
      {step === 1 && (
        <>
          <p className={styles.eyebrow}>Step 1 of 2</p>
          <h1>Where do you begin?</h1>
          <p className={styles.lede}>
            Pick the level that fits you now. You can change it any time.
          </p>
          <div className={styles.options} role="radiogroup" aria-label="Starting level">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={level === l}
                className={styles.option}
                onClick={() => setLevel(l)}
              >
                <span className={styles.optionLevel}>{l}</span>
                <span className={styles.optionText}>{LEVEL_BLURB[l]}</span>
              </button>
            ))}
          </div>
          <p className={styles.note}>
            JLPT levels here are unofficial estimates from community lists.
          </p>
          <Button variant="primary" size="large" onClick={() => setStep(2)}>
            Continue
          </Button>
        </>
      )}
      {step === 2 && (
        <>
          <p className={styles.eyebrow}>Step 2 of 2</p>
          <h1>How much each day?</h1>
          <p className={styles.lede}>
            New cards per day. Reviews come on top, and you can pause new ones whenever you like.
          </p>
          <div className={styles.options} role="radiogroup" aria-label="New cards per day">
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={newPerDay === n}
                className={styles.option}
                onClick={() => setNewPerDay(n)}
              >
                <span className={styles.optionLevel}>{n}</span>
                <span className={styles.optionText}>
                  {n === 5
                    ? 'Light. About 5 minutes.'
                    : n === 10
                      ? 'Steady. About 10 minutes.'
                      : 'Intense. 20 minutes or more.'}
                </span>
              </button>
            ))}
          </div>
          <Button variant="primary" size="large" onClick={() => void finish()}>
            Begin
          </Button>
        </>
      )}
    </section>
  )
}
