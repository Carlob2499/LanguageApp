import styles from './RouteShimmer.module.css'

/** Shown while a route's code loads: a quiet gold sweep across an empty plate, never a spinner. */
export function RouteShimmer() {
  return (
    <div className={styles.shimmer} role="status" aria-live="polite" aria-label="Loading">
      <div className={styles.plate} />
    </div>
  )
}
