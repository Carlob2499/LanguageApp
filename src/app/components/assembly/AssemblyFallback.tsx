import type { StrokeItem } from '@/packs/ja/types'

import styles from './AssemblyFallback.module.css'
import { BOX, type Piece } from './pieces'

export interface AssemblyFallbackProps {
  item: StrokeItem
  pieces: Piece[]
  highlighted: number | undefined
  onSelect: (index: number | undefined) => void
}

/**
 * The flat equivalent of the 3D scene: each component drawn on its own, in order, adding up to
 * the whole character. Used under reduced motion, without WebGL, and by choice.
 */
export function AssemblyFallback({ item, pieces, highlighted, onSelect }: AssemblyFallbackProps) {
  return (
    <div className={styles.row} role="group" aria-label={`${item.char} built from its parts`}>
      {pieces.map((piece, k) => (
        <div key={piece.index} className={styles.step}>
          {k > 0 && (
            <span className={styles.op} aria-hidden="true">
              +
            </span>
          )}
          <button
            type="button"
            className={styles.piece}
            aria-pressed={highlighted === piece.index}
            aria-label={piece.element ? `Part ${piece.element}` : 'Remaining strokes'}
            onClick={() => onSelect(highlighted === piece.index ? undefined : piece.index)}
          >
            <svg viewBox={`0 0 ${BOX} ${BOX}`} className={styles.glyph} aria-hidden="true">
              {item.strokes.map((s, i) => (
                <path
                  key={i}
                  d={s.d}
                  className={piece.strokeIndices.includes(i) ? styles.ink : styles.faint}
                />
              ))}
            </svg>
            <span className={styles.caption} lang={piece.element ? 'ja' : undefined}>
              {piece.element ?? '…'}
            </span>
          </button>
        </div>
      ))}
      <div className={styles.step}>
        <span className={styles.op} aria-hidden="true">
          =
        </span>
        <div className={`${styles.piece} ${styles.whole}`}>
          <svg viewBox={`0 0 ${BOX} ${BOX}`} className={styles.glyph} aria-hidden="true">
            {item.strokes.map((s, i) => (
              <path
                key={i}
                d={s.d}
                className={
                  highlighted === undefined ||
                  pieces.find((p) => p.index === highlighted)?.strokeIndices.includes(i)
                    ? styles.gold
                    : styles.faint
                }
              />
            ))}
          </svg>
          <span className={styles.caption} lang="ja">
            {item.char}
          </span>
        </div>
      </div>
    </div>
  )
}
