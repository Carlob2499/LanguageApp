/** Japanese speech recognition where the browser offers it (Safari, Chrome). Not in Firefox. */
interface RecognitionResultList {
  length: number
  [index: number]: { length: number; [index: number]: { transcript: string } }
}
interface RecognitionLike {
  lang: string
  maxAlternatives: number
  interimResults: boolean
  onresult: ((e: { results: RecognitionResultList }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => RecognitionLike

function ctor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function recognitionSupported(): boolean {
  return ctor() !== undefined
}

export type HearResult = { ok: true; alternatives: string[] } | { ok: false; error: string }

/** Listens for one Japanese utterance and resolves with the recogniser's alternatives. */
export function hearJapanese(timeoutMs = 6000): { result: Promise<HearResult>; stop: () => void } {
  const Ctor = ctor()
  if (!Ctor) return { result: Promise.resolve({ ok: false, error: 'unsupported' }), stop: () => {} }
  const r = new Ctor()
  r.lang = 'ja-JP'
  r.maxAlternatives = 5
  r.interimResults = false
  let settle: (v: HearResult) => void = () => {}
  const result = new Promise<HearResult>((resolve) => {
    let done = false
    settle = (v) => {
      if (done) return
      done = true
      resolve(v)
    }
  })
  const timer = window.setTimeout(() => r.stop(), timeoutMs)
  r.onresult = (e) => {
    const first = e.results[0]
    const alternatives: string[] = []
    if (first) for (let i = 0; i < first.length; i++) alternatives.push(first[i]!.transcript)
    settle({ ok: true, alternatives })
  }
  r.onerror = (e) => settle({ ok: false, error: e.error })
  r.onend = () => {
    window.clearTimeout(timer)
    settle({ ok: false, error: 'no-speech' })
  }
  try {
    r.start()
  } catch {
    settle({ ok: false, error: 'start-failed' })
  }
  return { result, stop: () => r.stop() }
}
