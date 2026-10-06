/* eslint-disable react-refresh/only-export-components -- the path generator is shared with tests */
import { useMemo } from 'react'

import styles from './Crack.module.css'

/**
 * A procedural crack for a card, seeded by its key so the same card always cracks the same way.
 * `gold` 0..1 is how much of the crack has been repaired; the gold line retraces the crack.
 */
function seeded(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export function crackPath(
  seed: string,
  width = 320,
  height = 200,
): { main: string; branches: string[] } {
  const rand = seeded(seed)
  const points: Array<[number, number]> = []
  const startX = rand() * width * 0.3
  let x = startX
  let y = height * (0.2 + rand() * 0.6)
  points.push([x, y])
  const steps = 7 + Math.floor(rand() * 4)
  for (let i = 0; i < steps; i++) {
    x += (width * 0.9 - startX) / steps
    y += (rand() - 0.5) * height * 0.35
    y = Math.max(8, Math.min(height - 8, y))
    points.push([x, y])
  }
  const main = points
    .map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`)
    .join(' ')
  const branches: string[] = []
  const count = 1 + Math.floor(rand() * 2)
  for (let b = 0; b < count; b++) {
    const at = points[2 + Math.floor(rand() * (points.length - 3))]!
    const dir = rand() > 0.5 ? 1 : -1
    const bx = at[0] + (20 + rand() * 50)
    const by = at[1] + dir * (20 + rand() * 45)
    const cx = at[0] + (10 + rand() * 20)
    const cy = at[1] + dir * (5 + rand() * 15)
    branches.push(
      `M${at[0].toFixed(1)} ${at[1].toFixed(1)} L${cx.toFixed(1)} ${cy.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)}`,
    )
  }
  return { main, branches }
}

export function Crack({
  seed,
  gold,
  drawing = false,
  className,
}: {
  seed: string
  gold: number
  drawing?: boolean
  className?: string
}) {
  const { main, branches } = useMemo(() => crackPath(seed), [seed])
  const length = 480
  const goldOffset = length * (1 - Math.max(0, Math.min(1, gold)))
  return (
    <svg
      className={[styles.crack, className].filter(Boolean).join(' ')}
      viewBox="0 0 320 200"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className={drawing ? styles.lineDrawing : styles.line} d={main} />
      {branches.map((d, i) => (
        <path
          key={i}
          className={drawing ? styles.branchDrawing : styles.branch}
          d={d}
          style={{ animationDelay: `${180 + i * 90}ms` }}
        />
      ))}
      {gold > 0 && (
        <>
          <path
            className={styles.goldGlow}
            d={main}
            style={{ strokeDasharray: length, strokeDashoffset: goldOffset }}
          />
          <path
            className={styles.gold}
            d={main}
            style={{ strokeDasharray: length, strokeDashoffset: goldOffset }}
          />
        </>
      )}
    </svg>
  )
}
