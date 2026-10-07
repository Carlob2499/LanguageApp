import { useEffect, useState } from 'react'

/** On-device Japanese speech. iOS lists voices late, so availability is a hook, not a constant. */
export type VoiceState = 'checking' | 'yes' | 'no'

export function japaneseVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined
  return window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('ja'))
}

export function useJapaneseVoice(): VoiceState {
  const [state, setState] = useState<VoiceState>('checking')
  useEffect(() => {
    if (typeof window.speechSynthesis === 'undefined') {
      const id = setTimeout(() => setState('no'), 0)
      return () => clearTimeout(id)
    }
    const check = () => {
      if (japaneseVoice()) setState('yes')
    }
    const first = window.setTimeout(check, 0)
    // No voice after a moment means none is coming.
    const giveUp = window.setTimeout(() => setState((s) => (s === 'checking' ? 'no' : s)), 1500)
    window.speechSynthesis.addEventListener('voiceschanged', check)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(giveUp)
      window.speechSynthesis.removeEventListener('voiceschanged', check)
    }
  }, [])
  return state
}

/** Speaks Japanese text; resolves when the utterance ends (or fails). */
export function speak(text: string, rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve()
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    const voice = japaneseVoice()
    if (voice) u.voice = voice
    u.rate = rate
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}
