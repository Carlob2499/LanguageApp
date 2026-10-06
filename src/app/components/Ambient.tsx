import { useEffect, useRef } from 'react'

import styles from './Ambient.module.css'

/**
 * Ambient lacquer: a slow drift of gold dust in depth behind the UI, drawn on a canvas with a
 * seeded generator so it looks the same on every visit. Static under reduced motion, paused
 * when the tab is hidden, capped at 1.5× device pixels.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Mote {
  x: number
  y: number
  z: number
  r: number
  vx: number
  vy: number
  phase: number
}

export function Ambient({ intensity = 1 }: { intensity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const rand = mulberry32(20261006)
    let motes: Mote[] = []
    let width = 0
    let height = 0
    let frame = 0
    let running = true
    let last = performance.now()

    function resize() {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      width = window.innerWidth
      height = window.innerHeight
      canvas!.width = Math.round(width * dpr)
      canvas!.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(90, (width * height) / 9000) * intensity)
      motes = Array.from({ length: count }, () => {
        const z = 0.3 + rand() * 0.7
        return {
          x: rand() * width,
          y: rand() * height,
          z,
          r: 0.6 + z * 1.6,
          vx: (rand() - 0.5) * 4 * z,
          vy: -(2 + rand() * 6) * z,
          phase: rand() * Math.PI * 2,
        }
      })
    }

    const FRAME_MS = 1000 / 30
    let lastFrame = 0
    function draw(now: number) {
      if (!reduced && running && now - lastFrame < FRAME_MS) {
        frame = requestAnimationFrame(draw)
        return
      }
      lastFrame = now
      const dt = Math.min(0.08, (now - last) / 1000)
      last = now
      ctx!.clearRect(0, 0, width, height)
      for (const m of motes) {
        if (!reduced) {
          m.x += m.vx * dt
          m.y += m.vy * dt
          m.phase += dt * 0.8
          if (m.y < -10) {
            m.y = height + 10
            m.x = rand() * width
          }
          if (m.x < -10) m.x = width + 10
          if (m.x > width + 10) m.x = -10
        }
        const twinkle = 0.55 + 0.45 * Math.sin(m.phase)
        const alpha = (0.08 + 0.22 * m.z) * twinkle
        ctx!.beginPath()
        ctx!.fillStyle = `rgba(217, 164, 65, ${alpha.toFixed(3)})`
        ctx!.arc(m.x, m.y, m.r, 0, Math.PI * 2)
        ctx!.fill()
      }
      if (!reduced && running) frame = requestAnimationFrame(draw)
    }

    function visibility() {
      running = document.visibilityState === 'visible'
      if (running && !reduced) {
        last = performance.now()
        frame = requestAnimationFrame(draw)
      } else cancelAnimationFrame(frame)
    }

    resize()
    // One static frame now; the drift starts once the page has had time to paint its content.
    const still = reduced
    const startLoop = () => {
      if (still || !running) return
      last = performance.now()
      frame = requestAnimationFrame(draw)
    }
    running = false
    draw(performance.now())
    running = document.visibilityState === 'visible'
    const idle = window.setTimeout(startLoop, 1800)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      running = false
      window.clearTimeout(idle)
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [intensity])

  return (
    <div className={styles.ambient} aria-hidden="true">
      <canvas ref={ref} className={styles.canvas} />
      <div className={styles.vignette} />
    </div>
  )
  // The static lacquer gradient lives on the Shell so it is painted before this layer mounts.
}
