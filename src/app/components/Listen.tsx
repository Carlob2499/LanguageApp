import { useEffect, useState } from 'react'

import { speak, useJapaneseVoice } from '@/app/audio/voice'

import { Icon } from './Icon'
import styles from './Listen.module.css'

/**
 * A listening prompt: a large ripple button that speaks the word once on arrival and again on
 * every tap. Without a Japanese voice on the device it shows the reading in kana instead, so the
 * card still asks the same question in written form.
 */
export function Listen({ text, autoPlay = true }: { text: string; autoPlay?: boolean }) {
  const voice = useJapaneseVoice()
  const [playing, setPlaying] = useState(false)
  const [plays, setPlays] = useState(0)

  function play() {
    setPlaying(true)
    setPlays((n) => n + 1)
    void speak(text).then(() => setPlaying(false))
  }

  useEffect(() => {
    if (voice !== 'yes' || !autoPlay) return
    const id = window.setTimeout(play, 350)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play once per card when the voice is ready
  }, [voice, autoPlay])

  if (voice === 'checking') return <div className={styles.wrap} aria-hidden="true" />

  if (voice === 'no') {
    return (
      <div className={styles.wrap}>
        <p className={`${styles.fallback} ja-display`} lang="ja">
          {text}
        </p>
        <p className={styles.note}>
          No Japanese voice on this device, so here is how it sounds in kana.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        data-playing={playing ? 'true' : undefined}
        onClick={play}
        aria-label={plays > 0 ? 'Hear it again' : 'Hear the word'}
      >
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.ring} aria-hidden="true" />
        <span className={styles.ring} aria-hidden="true" />
        <Icon name="speaker" size={40} />
      </button>
      <p className={styles.note}>{plays > 1 ? `Heard ${plays} times.` : 'Tap to hear it again.'}</p>
    </div>
  )
}
