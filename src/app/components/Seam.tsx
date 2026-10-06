import { useReducedMotion } from 'motion/react'

import styles from './Seam.module.css'

/**
 * A kintsugi seam: a gold line drawn along a crack. `progress` 0..1 reveals the gold;
 * at 0 only the hairline crack shows. Decorative, hidden from assistive tech.
 */
export function Seam({ progress, className }: { progress: number; className?: string }) {
  const reduced = useReducedMotion()
  const length = 420
  const offset = length * (1 - Math.max(0, Math.min(1, progress)))
  return (
    <svg
      className={[styles.seam, className].filter(Boolean).join(' ')}
      viewBox="0 0 320 200"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className={styles.crack}
        d="M18 150 C70 120 95 98 118 90 C150 80 160 66 162 46 C164 30 150 22 156 8"
      />
      <path
        className={styles.gold}
        d="M18 150 C70 120 95 98 118 90 C150 80 160 66 162 46 C164 30 150 22 156 8"
        style={{
          strokeDasharray: length,
          strokeDashoffset: offset,
          transition: reduced ? 'none' : 'stroke-dashoffset 600ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      />
      <path
        className={styles.crack}
        d="M118 90 C150 100 190 118 214 146 C230 165 248 180 300 190"
      />
      <path
        className={styles.gold}
        d="M118 90 C150 100 190 118 214 146 C230 165 248 180 300 190"
        style={{
          strokeDasharray: length,
          strokeDashoffset: offset,
          transition: reduced
            ? 'none'
            : 'stroke-dashoffset 600ms 120ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      />
    </svg>
  )
}
