import { useNavigate } from '@/app/router/index'
import { useState } from 'react'

import { Button } from '@/app/components/Button'
import { useSettings } from '@/app/study/settings'
import { LEVELS, type Level } from '@/packs/ja/levels'

import styles from './Welcome.module.css'

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
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [level, setLevel] = useState<Level>('N5')
  const [newPerDay, setNewPerDay] = useState(10)

  async function finish() {
    await update({ onboarded: true, level, newPerDay })
    navigate('/')
  }

  return (
    <section className={styles.welcome} aria-live="polite">
      {step === 0 && (
        <>
          <svg className={styles.mark} viewBox="0 0 320 200" aria-hidden="true" focusable="false">
            <path
              className={styles.markCrack}
              d="M18 150 C70 120 95 98 118 90 C150 80 160 66 162 46 C164 30 150 22 156 8"
            />
            <path
              className={styles.markGold}
              d="M18 150 C70 120 95 98 118 90 C150 80 160 66 162 46 C164 30 150 22 156 8"
            />
            <path
              className={styles.markCrack}
              d="M118 90 C150 100 190 118 214 146 C230 165 248 180 300 190"
            />
            <path
              className={styles.markGold}
              d="M118 90 C150 100 190 118 214 146 C230 165 248 180 300 190"
            />
          </svg>
          <h1>Kintsugi</h1>
          <p className={styles.lede}>
            Learn Japanese kanji and words, one short session a day. Every mistake you make here
            gets repaired in gold.
          </p>
          <Button variant="primary" size="large" onClick={() => setStep(1)}>
            Start
          </Button>
        </>
      )}
      {step === 1 && (
        <>
          <p className={styles.eyebrow}>Step 1 of 2</p>
          <h1>Where do you begin?</h1>
          <p className={styles.lede}>
            Pick the level that feels like today. You can change it any time.
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
