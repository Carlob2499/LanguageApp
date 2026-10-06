import { useEffect, useRef } from 'react'

import styles from './GoldFlecks.module.css'

/** A short burst of gold-leaf flecks for a completed session. One 1.4 s run, then it stops. */
export function GoldFlecks({ count = 70 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = (canvas.width = Math.round(canvas.clientWidth * dpr))
    const h = (canvas.height = Math.round(canvas.clientHeight * dpr))
    const flecks = Array.from({ length: count }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h * 0.45,
      vx: (Math.random() - 0.5) * 9 * dpr,
      vy: -(5 + Math.random() * 9) * dpr,
      s: (3 + Math.random() * 5) * dpr,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.3,
      hue: Math.random() > 0.5 ? '#f0c56b' : '#d9a441',
    }))
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = (now - start) / 1400
      ctx.clearRect(0, 0, w, h)
      for (const f of flecks) {
        f.vy += 0.22 * dpr
        f.x += f.vx
        f.y += f.vy
        f.a += f.va
        ctx.save()
        ctx.translate(f.x, f.y)
        ctx.rotate(f.a)
        ctx.globalAlpha = Math.max(0, 1 - t) * 0.95
        ctx.fillStyle = f.hue
        ctx.fillRect(-f.s / 2, -f.s / 4, f.s, f.s / 2)
        ctx.restore()
      }
      if (t < 1) frame = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w, h)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [count])
  return <canvas ref={ref} className={styles.flecks} aria-hidden="true" />
}
