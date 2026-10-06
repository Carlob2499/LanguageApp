import { useEffect, useRef, useState } from 'react'

import { Icon } from './Icon'
import styles from './Speak.module.css'

type Voice = 'clip' | 'synth' | 'none'

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices?.() ?? []
  return voices.find((v) => v.lang.toLowerCase().startsWith('ja')) ?? undefined
}

/**
 * Plays a recorded clip when the pack has one, else speaks with an on-device Japanese voice.
 * Hidden when neither exists (iOS lists voices late; we listen for voiceschanged).
 */
export function Speak({
  text,
  clip,
  label = 'Play audio',
  size = 20,
  className,
}: {
  text: string
  clip?: string | undefined
  label?: string | undefined
  size?: number
  className?: string | undefined
}) {
  const [mode, setMode] = useState<Voice>(clip ? 'clip' : 'none')
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (clip || !('speechSynthesis' in window)) return
    const check = () => setMode(japaneseVoice() ? 'synth' : 'none')
    const first = window.setTimeout(check, 0)
    window.speechSynthesis.addEventListener('voiceschanged', check)
    const retry = window.setTimeout(check, 1200)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', check)
      window.clearTimeout(first)
      window.clearTimeout(retry)
    }
  }, [clip])

  if (mode === 'none') return null

  function play() {
    if (mode === 'clip' && audio.current) {
      audio.current.currentTime = 0
      void audio.current.play()
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    const voice = japaneseVoice()
    if (voice) utterance.voice = voice
    utterance.rate = 0.92
    utterance.onstart = () => setPlaying(true)
    utterance.onend = () => setPlaying(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  return (
    <>
      <button
        type="button"
        className={[styles.button, playing ? styles.playing : '', className]
          .filter(Boolean)
          .join(' ')}
        onClick={play}
        aria-label={label}
      >
        <Icon name="speaker" size={size} />
      </button>
      {mode === 'clip' && clip && (
        <audio
          ref={audio}
          src={clip}
          preload="none"
          onPlay={() => setPlaying(true)}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
        />
      )}
    </>
  )
}
