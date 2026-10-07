import { useSettings } from '@/app/study/settings'

import type { Cue } from './bus'

/**
 * Every sound is synthesised here with WebAudio, so the app ships no audio files and works
 * offline. The context is created on first use after a user gesture. WebAudio follows the
 * phone's silent switch, which is what a learner expects.
 */
let ctx: AudioContext | undefined
let master: GainNode | undefined
let noise: AudioBuffer | undefined

/** D yo scale (D E G A B) in semitones above D4: calm, no half-step tension. */
const YO = [0, 2, 7, 9, 14, 12, 19, 21, 26]
const D4 = 293.66

const hz = (note: number): number => D4 * Math.pow(2, (YO[Math.abs(note) % YO.length] ?? 0) / 12)

function ensure(): { ctx: AudioContext; out: GainNode } | undefined {
  if (typeof AudioContext === 'undefined') return undefined
  if (!ctx) {
    ctx = new AudioContext()
    const comp = ctx.createDynamicsCompressor()
    master = ctx.createGain()
    master.gain.value = 0.8
    master.connect(comp).connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  if (ctx.state !== 'running' || !master) return undefined
  return { ctx, out: master }
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = noise.getChannelData(0)
    let seed = 1
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 16807) % 2147483647
      d[i] = (seed / 2147483647) * 2 - 1
    }
  }
  return noise
}

function env(g: GainNode, c: AudioContext, at: number, peak: number, decay: number): void {
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(peak, at + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay)
  void c
}

function pluck(c: AudioContext, out: AudioNode, f: number, at: number, vol: number): void {
  const g = c.createGain()
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(f * 7, at)
  lp.frequency.exponentialRampToValueAtTime(f * 1.5, at + 0.6)
  env(g, c, at, vol, 1.4)
  for (const [mult, detune, lvl] of [
    [1, 0, 1],
    [2, 4, 0.35],
    [3, -3, 0.12],
  ] as const) {
    const o = c.createOscillator()
    o.type = 'triangle'
    o.frequency.value = f * mult
    o.detune.value = detune
    const v = c.createGain()
    v.gain.value = lvl
    o.connect(v).connect(lp)
    o.start(at)
    o.stop(at + 1.5)
  }
  lp.connect(g).connect(out)
}

function thud(
  c: AudioContext,
  out: AudioNode,
  from: number,
  to: number,
  at: number,
  vol: number,
  len: number,
): void {
  const o = c.createOscillator()
  const g = c.createGain()
  o.frequency.setValueAtTime(from, at)
  o.frequency.exponentialRampToValueAtTime(to, at + len * 0.6)
  env(g, c, at, vol, len)
  o.connect(g).connect(out)
  o.start(at)
  o.stop(at + len + 0.05)
}

function puff(
  c: AudioContext,
  out: AudioNode,
  at: number,
  vol: number,
  len: number,
  lo: number,
  hi: number,
  sweep = false,
): void {
  const s = c.createBufferSource()
  s.buffer = noiseBuffer(c)
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 0.9
  f.frequency.setValueAtTime(lo, at)
  if (sweep) f.frequency.exponentialRampToValueAtTime(hi, at + len)
  const g = c.createGain()
  env(g, c, at, vol, len)
  s.connect(f).connect(g).connect(out)
  s.start(at)
  s.stop(at + len + 0.05)
}

function bell(c: AudioContext, out: AudioNode, f: number, at: number, vol: number): void {
  // Inharmonic partials, the way a small temple bell or fūrin rings.
  for (const [mult, lvl, decay] of [
    [1, 1, 1.8],
    [2.76, 0.4, 1.1],
    [5.4, 0.18, 0.6],
  ] as const) {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = 'sine'
    o.frequency.value = f * mult
    env(g, c, at, vol * lvl, decay)
    o.connect(g).connect(out)
    o.start(at)
    o.stop(at + decay + 0.05)
  }
}

export function play(name: Cue, note = 0): void {
  const { sound, motion } = useSettings.getState().settings
  if (!sound) return
  const gentle = motion === 'gentle'
  const live = ensure()
  if (!live) return
  const { ctx: c, out } = live
  const t = c.currentTime + 0.01
  const vol = gentle ? 0.6 : 1
  switch (name) {
    case 'koto':
      pluck(c, out, hz(note), t, 0.22 * vol)
      break
    case 'chime':
      bell(c, out, hz(note) * 2, t, 0.12 * vol)
      break
    case 'seal':
      thud(c, out, 150, 55, t, 0.5 * vol, 0.22)
      puff(c, out, t, 0.12 * vol, 0.08, 1200, 1200)
      pluck(c, out, hz(note), t + 0.04, 0.16 * vol)
      break
    case 'gold':
      for (let i = 0; i < 3; i++) bell(c, out, hz(note + i * 2) * 2, t + i * 0.09, 0.09 * vol)
      break
    case 'taiko':
      if (gentle) break
      thud(c, out, 130, 42, t, 0.9, 0.5)
      puff(c, out, t, 0.18, 0.12, 400, 400)
      break
    case 'swish':
      if (gentle) break
      puff(c, out, t, 0.14, 0.32, 700, 3000, true)
      break
    case 'crack':
      // A dry, quiet tick: a lapse is not an alarm.
      puff(c, out, t, 0.07 * vol, 0.06, 2500, 2500)
      thud(c, out, 220, 110, t, 0.1 * vol, 0.12)
      break
    case 'tap':
      puff(c, out, t, 0.05 * vol, 0.03, 3000, 3000)
      break
  }
}
