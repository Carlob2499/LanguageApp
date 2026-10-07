import { useEffect } from 'react'

import styles from './Choices.module.css'

export interface Choice {
  id: string
  label: string
  /** Secondary line under the label, e.g. a reading. */
  sub?: string | undefined
  lang?: 'ja' | undefined
}

/**
 * A multiple-choice answer row. Keys 1–4 pick; after a pick the right answer is lit and the
 * wrong one marked, and the group locks until the next card.
 */
export function Choices({
  choices,
  correctId,
  picked,
  onPick,
  label,
}: {
  choices: Choice[]
  correctId: string
  picked?: string | undefined
  onPick: (id: string) => void
  label: string
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (picked || e.target instanceof HTMLInputElement) return
      const i = Number.parseInt(e.key, 10) - 1
      const choice = choices[i]
      if (choice) onPick(choice.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choices, onPick, picked])

  return (
    <div className={styles.choices} role="group" aria-label={label}>
      {choices.map((c, i) => {
        const state = picked
          ? c.id === correctId
            ? 'right'
            : c.id === picked
              ? 'wrong'
              : 'dim'
          : undefined
        return (
          <button
            key={c.id}
            type="button"
            className={styles.choice}
            data-state={state}
            disabled={Boolean(picked)}
            onClick={() => onPick(c.id)}
            lang={c.lang}
          >
            <span className={styles.label} data-long={c.label.length > 12 ? 'true' : undefined}>
              {c.label}
            </span>
            {c.sub && <span className={styles.sub}>{c.sub}</span>}
            <kbd className={styles.kbd} aria-hidden="true">
              {i + 1}
            </kbd>
          </button>
        )
      })}
    </div>
  )
}
