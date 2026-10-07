import { useEffect, useRef } from 'react'

import { cue } from './bus'
import { clamp01, eio, mulberry32, outCubic, seg } from './ease'
import styles from './Opening.module.css'

const DURATION = 3.3
export const OPENED_KEY = 'kintsugi.opened'

/**
 * The opening: black lacquer, a held breath, one hairline crack that runs across the screen
 * and fills with gold, then the name resolves in the light. About three seconds, any tap or key
 * skips it, and it plays once per visit.
 */
export default function Opening({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    const box = root.current
    const ctx = el?.getContext('2d')
    if (!el || !box || !ctx) return
    let dpr = Math.min(2, window.devicePixelRatio || 1)
    let w = window.innerWidth
    let h = window.innerHeight
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = window.innerWidth
      h = window.innerHeight
      el.width = Math.round(w * dpr)
      el.height = Math.round(h * dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    // One crack, fixed by seed so every launch looks the same: a jagged diagonal.
    const rnd = mulberry32(1868)
    const crack: Array<[number, number]> = []
    for (let i = 0; i <= 14; i++) {
      const u = i / 14
      crack.push([u, 0.12 + u * 0.76 + (i === 0 || i === 14 ? 0 : (rnd() - 0.5) * 0.09)])
    }
    const dust = Array.from({ length: 36 }, () => ({
      x: rnd(),
      y: rnd(),
      r: 0.6 + rnd() * 1.6,
      s: 0.2 + rnd() * 0.6,
    }))

    const cues = [
      { at: 0.5, fn: () => cue('koto', 0) },
      { at: 1.45, fn: () => cue('koto', 2) },
      { at: 1.95, fn: () => cue('gold', 4) },
    ]
    const timers = cues.map((c) => window.setTimeout(c.fn, c.at * 1000))

    let frame = 0
    let finished = false
    const start = performance.now()
    const finish = () => {
      if (finished) return
      finished = true
      cancelAnimationFrame(frame)
      timers.forEach((id) => window.clearTimeout(id))
      onDone()
    }
    const skip = () => finish()
    window.addEventListener('pointerdown', skip, { once: true })
    window.addEventListener('keydown', skip, { once: true })

    const tick = (now: number) => {
      const t = (now - start) / 1000
      if (t >= DURATION) return finish()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const g = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.75)
      g.addColorStop(0, '#2a1512')
      g.addColorStop(1, '#0b0504')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // Gold dust drifting up, barely there.
      ctx.fillStyle = '#d9a441'
      for (const d of dust) {
        ctx.globalAlpha = 0.18 * seg(t, 0.2, 1.2) * (0.5 + 0.5 * Math.sin(t * d.s * 3 + d.x * 9))
        ctx.beginPath()
        ctx.arc(d.x * w, ((d.y - t * d.s * 0.04 + 1) % 1) * h, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // The crack: draws across (0.45–1.5 s), then fills with gold (1.3–2.2 s).
      const drawn = outCubic(seg(t, 0.45, 1.5))
      const fill = eio(seg(t, 1.3, 2.2))
      const last = Math.max(1, Math.floor(drawn * (crack.length - 1)))
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const path = () => {
        ctx.beginPath()
        crack.slice(0, last + 1).forEach(([u, v], i) => {
          const x = u * w
          const y = v * h
          if (i) ctx.lineTo(x, y)
          else ctx.moveTo(x, y)
        })
      }
      if (drawn > 0) {
        path()
        ctx.strokeStyle = `rgba(243,237,227,${0.55 * (1 - fill)})`
        ctx.lineWidth = 1
        ctx.stroke()
        if (fill > 0) {
          path()
          ctx.shadowColor = '#d9a441'
          ctx.shadowBlur = 24 * fill
          ctx.strokeStyle = '#d9a441'
          ctx.lineWidth = 1 + 5 * fill
          ctx.stroke()
          path()
          ctx.shadowBlur = 0
          ctx.strokeStyle = '#f0c56b'
          ctx.lineWidth = 1 + 1.4 * fill
          ctx.stroke()
        }
      }

      // The name resolves in a sweep of light (1.9–2.7 s).
      const reveal = outCubic(seg(t, 1.9, 2.7))
      if (reveal > 0) {
        const size = Math.min(w * 0.28, 150)
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, w * (0.1 + 0.9 * reveal), h)
        ctx.clip()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowColor = 'rgba(217,164,65,0.6)'
        ctx.shadowBlur = 30 * (1 - reveal) + 8
        ctx.fillStyle = '#f3ede3'
        ctx.font = `700 ${size}px "Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif`
        ctx.fillText('金継ぎ', w / 2, h * 0.5)
        ctx.shadowBlur = 0
        ctx.fillStyle = '#d9a441'
        ctx.font = `600 ${Math.max(12, size * 0.12)}px "M PLUS 2", system-ui, sans-serif`
        ctx.globalAlpha = seg(t, 2.2, 2.8)
        ctx.fillText('K I N T S U G I', w / 2, h * 0.5 + size * 0.7)
        ctx.restore()
      }

      // Exit: the whole scene lifts away.
      box.style.opacity = String(1 - eio(clamp01((t - 2.75) / (DURATION - 2.75))))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      finished = true
      cancelAnimationFrame(frame)
      timers.forEach((id) => window.clearTimeout(id))
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [onDone])

  return (
    <div ref={root} className={styles.root} aria-hidden="true">
      <canvas ref={canvas} className={styles.canvas} />
    </div>
  )
}
