import { useEffect, useRef } from 'react'

import { clamp01, eio, lerp, mulberry32, outBack, outCubic, seg } from './ease'
import { onEffect, type Effect } from './bus'
import { motionTier } from './tier'

import styles from './Stage.module.css'

const GOLD = '#d9a441'
const GOLD_LIGHT = '#f0c56b'
const LACQUER = '#0c1018'
const SHU = '#e34234'

interface Live {
  effect: Effect
  start: number
  dur: number
  seed: number
}

const DURATION: Record<Effect['kind'], number> = { seal: 0.85, gold: 1.1, slash: 0.55, combo: 1.15 }

/**
 * One full-screen canvas for every short effect: seals, gold cracks, brush wipes and combo
 * text. It draws only while an effect is alive, is time-based (so iOS Low Power Mode, which
 * halves the frame rate, still plays at the right speed), and ignores input.
 */
export default function Stage() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const live: Live[] = []
    let frame = 0
    let dpr = 1
    let w = 0
    let h = 0
    let seeds = 1

    function size() {
      if (!canvas) return
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    size()
    window.addEventListener('resize', size)

    function tick(now: number) {
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      for (let i = live.length - 1; i >= 0; i--) {
        const l = live[i]!
        const t = (now - l.start) / 1000
        if (t >= l.dur) {
          live.splice(i, 1)
          continue
        }
        ctx.save()
        draw(ctx, l, t / l.dur, t, w, h)
        ctx.restore()
      }
      frame = live.length ? requestAnimationFrame(tick) : 0
      if (!live.length) ctx.clearRect(0, 0, w, h)
    }

    const off = onEffect((effect) => {
      const gentle = motionTier() === 'gentle'
      // Gentle drops the wipe and the telop; seals and gold stay, softer.
      if (gentle && (effect.kind === 'slash' || effect.kind === 'combo')) return
      live.push({ effect, start: performance.now(), dur: DURATION[effect.kind], seed: seeds++ })
      if (!frame) frame = requestAnimationFrame(tick)
    })

    return () => {
      off()
      window.removeEventListener('resize', size)
      cancelAnimationFrame(frame)
    }
  }, [])

  return <canvas ref={ref} className={styles.stage} aria-hidden="true" />
}

function draw(ctx: CanvasRenderingContext2D, l: Live, p: number, t: number, w: number, h: number) {
  const e = l.effect
  if (e.kind === 'seal') return seal(ctx, e.x, e.y, p, t)
  if (e.kind === 'gold') return goldCrack(ctx, e.x, e.y, p, l.seed)
  if (e.kind === 'slash') return slash(ctx, w, h, p, e.heavy)
  return combo(ctx, w, h, p, t, e.beat, l.seed)
}

/** A vermilion hanko pressed onto the page: lands with weight, ripples once, fades. */
function seal(ctx: CanvasRenderingContext2D, x: number, y: number, p: number, t: number) {
  const land = seg(t, 0, 0.16)
  const scale = lerp(1.7, 1, outBack(land, 1.6))
  const alpha = (1 - eio(seg(p, 0.6, 1))) * clamp01(land * 3)
  const size = 84
  ctx.translate(x, y)
  // Ink ripple.
  ctx.globalAlpha = alpha * (1 - seg(t, 0.14, 0.6)) * 0.6
  ctx.strokeStyle = SHU
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.55 + outCubic(seg(t, 0.14, 0.6)) * 70, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = alpha
  ctx.rotate(-0.1)
  ctx.scale(scale, scale)
  ctx.fillStyle = SHU
  roundRect(ctx, -size / 2, -size / 2, size, size, 10)
  ctx.fill()
  // Carved characters: the stamp reads 合 ("fits", as in pass).
  ctx.globalCompositeOperation = 'destination-out'
  ctx.font = `700 ${size * 0.66}px "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('合', 0, size * 0.04)
  ctx.lineWidth = 3
  roundRect(ctx, -size / 2 + 6, -size / 2 + 6, size - 12, size - 12, 6)
  ctx.stroke()
}

/** A hairline crack runs out from the point and fills with gold light, then settles. */
function goldCrack(ctx: CanvasRenderingContext2D, x: number, y: number, p: number, seed: number) {
  const rnd = mulberry32(seed * 977)
  const draw = outCubic(seg(p, 0, 0.55))
  const glow = Math.sin(Math.PI * seg(p, 0.35, 1))
  const fade = 1 - eio(seg(p, 0.75, 1))
  ctx.translate(x, y)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const dir of [-1, 1]) {
    const pts: Array<[number, number]> = [[0, 0]]
    let px = 0
    let py = 0
    for (let i = 0; i < 9; i++) {
      px += dir * (18 + rnd() * 22)
      py += (rnd() - 0.5) * 34
      pts.push([px, py])
    }
    const n = Math.max(1, Math.floor(draw * (pts.length - 1)))
    ctx.beginPath()
    ctx.moveTo(0, 0)
    for (let i = 1; i <= n; i++) ctx.lineTo(pts[i]![0], pts[i]![1])
    ctx.globalAlpha = fade * 0.5 * glow
    ctx.strokeStyle = GOLD
    ctx.lineWidth = 12
    ctx.stroke()
    ctx.globalAlpha = fade
    ctx.strokeStyle = GOLD_LIGHT
    ctx.lineWidth = 2.2
    ctx.stroke()
  }
}

/** A diagonal brush wipe: lacquer sweeps across with a gold edge, then clears. */
function slash(ctx: CanvasRenderingContext2D, w: number, h: number, p: number, heavy: boolean) {
  const skew = h * 0.22
  const inP = outCubic(seg(p, 0, 0.42))
  const outP = eio(seg(p, 0.5, 1))
  const left = -skew + (w + skew * 2) * outP
  const right = -skew + (w + skew * 2) * inP
  if (right <= left) return
  const band = (a: number, b: number, color: string) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(a + skew, 0)
    ctx.lineTo(b + skew, 0)
    ctx.lineTo(b - skew, h)
    ctx.lineTo(a - skew, h)
    ctx.closePath()
    ctx.fill()
  }
  if (heavy) band(left - 26, right - 26, SHU)
  band(left, right, LACQUER)
  band(right - 5, right, GOLD)
}

/** Telop: the streak number slams in over skewed gold bars, with speed lines at 5 and 10. */
function combo(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: number,
  t: number,
  beat: 3 | 5 | 10,
  seed: number,
) {
  const inP = outBack(seg(t, 0, 0.18), 1.8)
  const fade = 1 - eio(seg(p, 0.7, 1))
  const cx = w / 2
  const cy = h * 0.3
  if (beat >= 5) {
    const rnd = mulberry32(seed * 31)
    ctx.strokeStyle = GOLD_LIGHT
    ctx.lineWidth = 1.5
    ctx.globalAlpha = fade * 0.55 * (1 - seg(t, 0.1, 0.8))
    for (let i = 0; i < (beat === 10 ? 46 : 28); i++) {
      const a = rnd() * Math.PI * 2
      const r0 = 120 + rnd() * 80 + outCubic(seg(t, 0, 0.5)) * 160
      const r1 = r0 + 60 + rnd() * 120
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
      ctx.stroke()
    }
  }
  ctx.translate(cx, cy)
  ctx.transform(1, 0, -0.18, 1, 0, 0)
  ctx.globalAlpha = fade
  const barW = Math.min(w * 0.8, 360) * outCubic(seg(t, 0, 0.22))
  ctx.fillStyle = LACQUER
  ctx.fillRect(-barW / 2, -46, barW, 92)
  ctx.fillStyle = GOLD
  ctx.fillRect(-barW / 2, -46, barW, 3)
  ctx.fillRect(-barW / 2, 43, barW, 3)
  ctx.scale(inP, inP)
  ctx.fillStyle = GOLD_LIGHT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `400 64px "Dela Gothic One", "M PLUS 2", sans-serif`
  ctx.fillText(`×${beat}`, 0, -4)
  ctx.font = `600 13px "M PLUS 2", system-ui, sans-serif`
  ctx.fillStyle = '#f3ede3'
  ctx.fillText(beat === 3 ? 'THREE IN A ROW' : beat === 5 ? 'FIVE IN A ROW' : 'TEN IN A ROW', 0, 34)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
