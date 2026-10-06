import { useMemo } from 'react'

import type { StrokeItem } from '@/packs/ja/types'

import styles from './StrokeGlyph.module.css'

export interface StrokeGlyphProps {
  item: StrokeItem
  /** Draw strokes one after another (a brush writing the character). Off = all strokes at once. */
  animate?: boolean
  /** Base milliseconds per stroke; scaled by each stroke's length. */
  speed?: number
  numbers?: boolean
  /** Component (group index) to highlight; other strokes dim. */
  highlightGroup?: number | undefined
  className?: string | undefined
  /** Accessible name; decorative when omitted. */
  label?: string | undefined
  /** Changing this restarts the drawing. */
  replayKey?: string | number
}

/** Rough path length from the numbers in a KanjiVG `d` string (absolute M + relative c/s/l). */
function roughLength(d: string): number {
  // KanjiVG paths are an absolute M followed by relative curves; the last pair of each curve is the
  // segment's end point, so summing those magnitudes approximates the drawn length.
  const nums = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? []
  let len = 0
  for (let i = 2; i + 1 < nums.length; i += 2) len += Math.hypot(nums[i]!, nums[i + 1]!) * 0.45
  return Math.max(10, len)
}

/**
 * Draws a character from KanjiVG paths. Every stroke is a path with `pathLength=1`, revealed by a
 * CSS dash animation that starts after the previous stroke, so the kanji writes itself in order.
 * No DOM measurement is needed; a replay remounts the strokes.
 */
export function StrokeGlyph({
  item,
  animate = true,
  speed = 320,
  numbers = false,
  highlightGroup,
  className,
  label,
  replayKey,
}: StrokeGlyphProps) {
  const plan = useMemo(() => {
    const out: Array<{ duration: number; delay: number }> = []
    let at = 0
    for (const s of item.strokes) {
      const duration = speed * Math.max(0.45, Math.min(1.8, roughLength(s.d) / 50))
      out.push({ duration, delay: at })
      at += duration * 0.85
    }
    return out
  }, [item, speed])
  const groupOf = useMemo(() => {
    const map = new Map<number, number>()
    item.groups.forEach((g, gi) => g.strokes.forEach((si) => map.set(si, gi)))
    return map
  }, [item])

  return (
    <svg
      key={`${item.id}-${replayKey ?? 0}`}
      viewBox="0 0 109 109"
      className={[styles.glyph, animate ? styles.animated : '', className]
        .filter(Boolean)
        .join(' ')}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {item.strokes.map((stroke, i) => {
        const gi = groupOf.get(i)
        const dim = highlightGroup !== undefined && gi !== highlightGroup
        const { duration, delay } = plan[i]!
        return (
          <path
            key={i}
            d={stroke.d}
            pathLength={1}
            className={dim ? styles.dim : styles.stroke}
            style={
              animate
                ? { animationDuration: `${duration}ms`, animationDelay: `${delay}ms` }
                : undefined
            }
          />
        )
      })}
      {numbers &&
        item.numbers.map(([x, y], i) => (
          <text
            key={i}
            x={x}
            y={y}
            className={styles.number}
            style={animate ? { animationDelay: `${plan[i]?.delay ?? 0}ms` } : undefined}
          >
            {i + 1}
          </text>
        ))}
    </svg>
  )
}
