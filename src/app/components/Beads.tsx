import styles from './Beads.module.css'

/** Session progress as a row of lacquer beads: gold for done, hollow for remaining. */
export function Beads({ done, total }: { done: number; total: number }) {
  const shown = Math.min(total, 12)
  const scale = total <= 12 ? 1 : total / 12
  const filled = Math.round(done / scale)
  return (
    <div
      className={styles.beads}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label="Session progress"
    >
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={i < filled ? styles.filled : styles.empty} />
      ))}
    </div>
  )
}
