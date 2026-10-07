/** Pure timing helpers shared by every canvas scene. No DOM, so they run under Vitest. */

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

/** Progress of `t` through the window [a, b], clamped to 0..1. */
export const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))

/** Ease in and out (cubic). */
export const eio = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2

export const outCubic = (x: number): number => 1 - Math.pow(1 - x, 3)

export const outExpo = (x: number): number => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x))

/** Overshoots slightly then settles: the weight of a seal landing. */
export const outBack = (x: number, overshoot = 1.4): number => {
  const c3 = overshoot + 1
  return 1 + c3 * Math.pow(x - 1, 3) + overshoot * Math.pow(x - 1, 2)
}

export const lerp = (a: number, b: number, x: number): number => a + (b - a) * x

/** Small deterministic generator so a scene looks the same every run (and in tests). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Combo thresholds that earn a flourish; the first run of three is the first beat. */
export const COMBO_BEATS = [3, 5, 10] as const

/** The flourish a streak earns on exactly this length, or undefined between beats. */
export function comboBeat(streak: number): 3 | 5 | 10 | undefined {
  return (COMBO_BEATS as readonly number[]).includes(streak)
    ? (streak as 3 | 5 | 10)
    : streak > 10 && streak % 10 === 0
      ? 10
      : undefined
}
