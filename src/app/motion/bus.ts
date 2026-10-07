import { motionTier } from './tier'

export type Cue = 'seal' | 'koto' | 'taiko' | 'chime' | 'swish' | 'crack' | 'gold' | 'tap'

export type Effect =
  | { kind: 'seal'; x: number; y: number }
  | { kind: 'gold'; x: number; y: number }
  | { kind: 'slash'; heavy: boolean }
  | { kind: 'combo'; beat: 3 | 5 | 10 }

type Listener = (effect: Effect) => void
const listeners = new Set<Listener>()

/** The stage subscribes here; with nothing mounted, effects are dropped for free. */
export function onEffect(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** Fire a canvas effect. Does nothing when animation is off. */
export function fx(effect: Effect): void {
  if (motionTier() === 'off') return
  for (const l of listeners) l(effect)
}

/** Play a synthesised cue. The synth loads on first use and honours the Sound setting. */
export function cue(name: Cue, note = 0): void {
  void import('./sound').then((m) => m.play(name, note))
}
