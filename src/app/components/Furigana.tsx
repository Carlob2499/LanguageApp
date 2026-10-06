import { useState } from 'react'

import styles from './Furigana.module.css'

/**
 * A word with its reading as ruby text. The reading is a hint layer: tap to cycle hidden →
 * furigana. Space for the ruby is always reserved so lines never jump.
 */
export function Furigana({
  text,
  reading,
  show = 'auto',
  className,
}: {
  text: string
  reading?: string | undefined
  show?: 'auto' | 'always' | 'never'
  className?: string | undefined
}) {
  const [revealed, setRevealed] = useState(show === 'always')
  const visible = show === 'always' || (show === 'auto' && revealed)
  const canToggle = show === 'auto' && Boolean(reading) && reading !== text
  if (!reading || reading === text) {
    return (
      <span lang="ja" className={className}>
        {text}
      </span>
    )
  }
  return (
    <ruby
      lang="ja"
      className={[styles.ruby, canToggle ? styles.toggle : '', className].filter(Boolean).join(' ')}
      onClick={canToggle ? () => setRevealed((v) => !v) : undefined}
      role={canToggle ? 'button' : undefined}
      tabIndex={canToggle ? 0 : undefined}
      aria-pressed={canToggle ? visible : undefined}
      aria-label={canToggle ? `${text}, ${visible ? 'hide' : 'show'} reading` : undefined}
      onKeyDown={
        canToggle
          ? (e) =>
              e.key === 'Enter' || e.key === ' '
                ? (e.preventDefault(), setRevealed((v) => !v))
                : undefined
          : undefined
      }
    >
      {text}
      <rp>(</rp>
      <rt className={visible ? styles.rtVisible : styles.rtHidden}>{reading}</rt>
      <rp>)</rp>
    </ruby>
  )
}
