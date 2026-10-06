import { animate, motion, useMotionValue, type PanInfo } from 'motion/react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

import styles from './Sheet.module.css'

/**
 * A bottom sheet with two detents (peek and full), dragged by its handle or its header.
 * Momentum decides the detent; the sheet rubber-bands past the top. The page behind dims.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  peek = 0.42,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Height fraction of the peek detent. */
  peek?: number
}) {
  const id = useId()
  const y = useMotionValue(0)
  const ref = useRef<HTMLDivElement>(null)
  const height = () => ref.current?.offsetHeight ?? window.innerHeight * 0.9
  const detents = () => ({ full: 0, peek: height() * (1 - peek), closed: height() })

  useEffect(() => {
    const d = detents()
    if (open) {
      y.set(d.closed)
      void animate(y, d.peek, { type: 'spring', bounce: 0.1, duration: 0.45 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function settle(_: unknown, info: PanInfo) {
    const d = detents()
    const projected = y.get() + info.velocity.y * 0.18
    const target =
      projected > (d.peek + d.closed) / 2 ? 'closed' : projected > d.peek / 2 ? 'peek' : 'full'
    void animate(y, d[target], {
      type: 'spring',
      bounce: 0.1,
      duration: 0.4,
      velocity: info.velocity.y,
    }).then(() => {
      if (target === 'closed') onClose()
    })
  }

  if (!open) return null
  return (
    <div className={styles.root}>
      <motion.div
        className={styles.scrim}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className={styles.sheet}
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.08, bottom: 0.9 }}
        dragMomentum={false}
        onDragEnd={settle}
      >
        <div className={styles.handle} aria-hidden="true" />
        <header className={styles.header}>
          <h2 id={`${id}-title`} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </motion.div>
    </div>
  )
}
