import { useEffect, useRef, useState } from 'react'

import { saveNote, useNote } from '@/app/study/notes'

import styles from './MemoryAid.module.css'

/**
 * The learner's own memory aid for an item. Nothing is ever pre-filled: the app has no licensed
 * source of mnemonics, so the only ones shown are the ones the learner writes.
 */
export function MemoryAid({ itemId, char }: { itemId: string; char: string }) {
  const stored = useNote(itemId)
  const [draft, setDraft] = useState<string>()
  const [saved, setSaved] = useState(false)
  const timer = useRef<number>(0)
  const value = draft ?? stored ?? ''

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function commit(text: string) {
    window.clearTimeout(timer.current)
    void saveNote(itemId, text).then(() => {
      setSaved(true)
      setDraft(undefined)
      timer.current = window.setTimeout(() => setSaved(false), 1800)
    })
  }

  return (
    <div className={styles.aid}>
      <label htmlFor={`aid-${itemId}`} className={styles.label}>
        Memory aid <span className={styles.yours}>(yours)</span>
      </label>
      <textarea
        id={`aid-${itemId}`}
        className={styles.field}
        rows={2}
        value={value}
        placeholder={`How will you remember ${char}? A picture, a story, a pun.`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          if (draft !== undefined) commit(e.target.value)
        }}
      />
      <p className={styles.note} aria-live="polite">
        {saved ? 'Saved on this device.' : 'Write your own memory aid. It saves when you tap away.'}
      </p>
    </div>
  )
}
