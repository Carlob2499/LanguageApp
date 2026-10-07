import { useEffect, useRef } from 'react'

import { eio, lerp, mulberry32, outBack, outCubic, seg } from './ease'
import { cue } from './bus'
import { reducedMotion } from './tier'

import styles from './Mended.module.css'

const COLS = 5
const ROWS = 3
const DURATION = 3.4

interface Shard {
  c: number
  r: number
  dx: number
  dy: number
  rot: number
  delay: number
}

/**
 * The end-of-session scene: the day's cards are shards of a lacquer bowl that fly together,
 * then gold runs along every seam. It plays once and holds its last frame; under reduced
 * motion it draws that last frame and nothing else.
 */
export default function Mended({ label }: { label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = ref.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = el.clientWidth
    const H = el.clientHeight
    el.width = Math.round(W * dpr)
    el.height = Math.round(H * dpr)

    const rnd = mulberry32(2024)
    // Jittered lattice: shard (c, r) is the quad between four neighbouring points.
    const pts: Array<Array<[number, number]>> = []
    for (let r = 0; r <= ROWS; r++) {
      pts.push([])
      for (let c = 0; c <= COLS; c++) {
        const edge = c === 0 || c === COLS || r === 0 || r === ROWS
        const j = (edge ? 0.05 : 0.28) / COLS
        pts[r]!.push([
          -1.1 + (2.2 * c) / COLS + (c === 0 || c === COLS ? 0 : (rnd() - 0.5) * 2.2 * j * 2),
          (1.3 * r) / ROWS + (r === 0 || r === ROWS ? 0 : (rnd() - 0.5) * 0.12),
        ])
      }
    }
    const shards: Shard[] = []
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const a = rnd() * Math.PI * 2
        const d = 1.6 + rnd() * 1.6
        shards.push({
          c,
          r,
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d - 0.6,
          rot: (rnd() - 0.5) * 2.4,
          delay: rnd() * 0.7,
        })
      }

    const s = Math.min(W / 2.6, H / 1.8)
    const ox = W / 2
    const oy = H * 0.5 - 0.65 * s

    function bowl(c2: CanvasRenderingContext2D) {
      c2.beginPath()
      c2.moveTo(-1.1, 0)
      c2.bezierCurveTo(-1.1, 0.75, -0.7, 1.3, -0.42, 1.3)
      c2.lineTo(0.42, 1.3)
      c2.bezierCurveTo(0.7, 1.3, 1.1, 0.75, 1.1, 0)
      c2.closePath()
    }

    function frame(t: number) {
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const gather = seg(t, 0, 1.9)
      // Soft shadow under the bowl once it has settled.
      ctx.save()
      ctx.globalAlpha = 0.5 * seg(t, 1.5, 2.2)
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.ellipse(ox, oy + 1.36 * s, 0.7 * s, 0.07 * s, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      for (const sh of shards) {
        const k = eio(seg(gather, sh.delay * 0.5, 0.5 + sh.delay * 0.5 + 0.3))
        const settle = outBack(seg(t, 1.5 + sh.delay * 0.3, 2.0 + sh.delay * 0.3), 2.4)
        const inv = 1 - k
        const q = [
          pts[sh.r]![sh.c]!,
          pts[sh.r]![sh.c + 1]!,
          pts[sh.r + 1]![sh.c + 1]!,
          pts[sh.r + 1]![sh.c]!,
        ]
        const cx = q.reduce((n, p) => n + p[0], 0) / 4
        const cy = q.reduce((n, p) => n + p[1], 0) / 4
        ctx.save()
        ctx.translate(ox, oy)
        ctx.scale(s, s)
        ctx.translate(cx + sh.dx * inv, cy + sh.dy * inv)
        ctx.rotate(sh.rot * inv)
        ctx.scale(lerp(1.03, 1, Math.min(1, settle)), lerp(1.03, 1, Math.min(1, settle)))
        ctx.translate(-cx, -cy)
        ctx.globalAlpha = 0.25 + 0.75 * outCubic(seg(t, sh.delay * 0.4, 0.6 + sh.delay * 0.4))
        bowl(ctx)
        ctx.clip()
        ctx.beginPath()
        q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
        ctx.closePath()
        const shade = ctx.createLinearGradient(-1, 0, 1, 1.3)
        shade.addColorStop(0, '#2c3850')
        shade.addColorStop(0.5, '#1a2133')
        shade.addColorStop(1, '#0c1018')
        ctx.fillStyle = shade
        ctx.fill()
        ctx.lineWidth = 0.012
        ctx.strokeStyle = 'rgba(243,237,227,0.14)'
        ctx.stroke()
        ctx.restore()
      }

      // Gold runs along the seams, then the rim catches the light.
      const gold = outCubic(seg(t, 2.0, 3.0))
      if (gold > 0) {
        ctx.save()
        ctx.translate(ox, oy)
        ctx.scale(s, s)
        bowl(ctx)
        ctx.clip()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const seam = (a: Array<[number, number]>, i: number) => {
          const u = seg(gold, (i % 7) * 0.05, 0.65 + (i % 7) * 0.05)
          if (u <= 0) return
          ctx.beginPath()
          ctx.moveTo(a[0]![0], a[0]![1])
          const last = Math.max(1, Math.round(u * (a.length - 1)))
          for (let k = 1; k <= last; k++) ctx.lineTo(a[k]![0], a[k]![1])
          ctx.shadowColor = '#d9a441'
          ctx.shadowBlur = 10 * s * 0.02
          ctx.strokeStyle = '#d9a441'
          ctx.lineWidth = 0.026
          ctx.stroke()
          ctx.shadowBlur = 0
          ctx.strokeStyle = '#f0c56b'
          ctx.lineWidth = 0.009
          ctx.stroke()
        }
        let n = 0
        for (let c = 1; c < COLS; c++)
          seam(
            pts.map((row) => row[c]!),
            n++,
          )
        for (let r = 1; r < ROWS; r++) seam(pts[r]!, n++)
        ctx.restore()
        ctx.save()
        ctx.translate(ox, oy)
        ctx.scale(s, s)
        // The rim: a dark opening with a gold lip that catches the light last.
        const rim = seg(t, 1.9, 2.5)
        ctx.globalAlpha = rim
        ctx.fillStyle = '#070a10'
        ctx.beginPath()
        ctx.ellipse(0, 0, 1.1, 0.13, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = rim * (0.35 + 0.65 * seg(t, 2.6, 3.2))
        ctx.strokeStyle = '#f0c56b'
        ctx.lineWidth = 0.022
        ctx.stroke()
        ctx.restore()
      }
    }

    if (reducedMotion()) {
      frame(DURATION)
      return
    }
    cue('swish')
    const timers = [
      window.setTimeout(() => cue('taiko'), 1500),
      window.setTimeout(() => cue('gold', 2), 2150),
    ]
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(DURATION, (now - start) / 1000)
      frame(t)
      if (t < DURATION) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  return <canvas ref={ref} className={styles.canvas} role="img" aria-label={label} />
}
