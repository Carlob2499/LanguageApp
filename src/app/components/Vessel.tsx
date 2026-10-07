import { useId } from 'react'

import styles from './Vessel.module.css'

/**
 * A lacquer bowl filling with gold. `fill` 0..1 is the level; `seams` is how many repairs it
 * carries (drawn as gold hairlines on the bowl). Used for today's session and for each level.
 */
export function Vessel({
  fill,
  seams = 0,
  size = 120,
  label,
  className,
}: {
  fill: number
  seams?: number
  size?: number
  label?: string | undefined
  className?: string | undefined
}) {
  const id = useId()
  const level = Math.max(0, Math.min(1, fill))
  const top = 30 + (1 - level) * 60
  const seamPaths = Array.from({ length: Math.min(seams, 6) }, (_, i) => {
    const x = 28 + ((i * 37) % 60)
    const y = 34 + ((i * 23) % 40)
    return `M${x} ${y} l6 9 l-3 8 l7 10`
  })
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={[styles.vessel, className].filter(Boolean).join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={`${id}-bowl`}>
          <path d="M22 30 Q22 96 60 96 Q98 96 98 30 Z" />
        </clipPath>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0c56b" />
          <stop offset="1" stopColor="#b8892f" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#232c40" />
          <stop offset="1" stopColor="#0c1018" />
        </linearGradient>
      </defs>
      <path
        d="M22 30 Q22 96 60 96 Q98 96 98 30 Z"
        fill={`url(#${id}-body)`}
        className={styles.body}
      />
      <g clipPath={`url(#${id}-bowl)`}>
        <rect
          x="0"
          y={top}
          width="120"
          height="120"
          fill={`url(#${id}-gold)`}
          className={styles.fill}
        />
        <path
          d={`M0 ${top} Q15 ${top - 3} 30 ${top} T60 ${top} T90 ${top} T120 ${top} V120 H0 Z`}
          fill="#f0c56b"
          opacity="0.5"
          className={styles.wave}
        />
      </g>
      {seamPaths.map((d, i) => (
        <path key={i} d={d} className={styles.seam} />
      ))}
      <ellipse cx="60" cy="30" rx="38" ry="7" className={styles.rim} />
      <path d="M22 30 Q22 96 60 96 Q98 96 98 30" className={styles.outline} />
    </svg>
  )
}
