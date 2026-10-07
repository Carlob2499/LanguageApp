import { animate, motion, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react'
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
  titleLang,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Height fraction of the peek detent. */
  peek?: number
  /** Language of the title, e.g. "ja" when it is a Japanese word. */
  titleLang?: string | undefined
}) {
  const reduced = useReducedMotion()
  const id = useId()
  const y = useMotionValue(0)
  const ref = useRef<HTMLDivElement>(null)
  const height = () => ref.current?.offsetHeight ?? window.innerHeight * 0.9
  const detents = () => ({ full: 0, peek: height() * (1 - peek), closed: height() })

  useEffect(() => {
    const d = detents()
    if (open) {
      y.set(d.closed)
      void animate(
        y,
        d.peek,
        reduced ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.45 },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Focus moves into the sheet, stays there, and returns to where it was on close.
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const frame = requestAnimationFrame(() =>
      ref.current?.querySelector<HTMLElement>('button, [href], input, [tabindex]')?.focus(),
    )
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const items = [
        ...ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        ),
      ]
      if (items.length === 0) return
      const first = items[0]!
      const last = items[items.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey, true)
      previous?.focus()
    }
  }, [open, onClose])

  function settle(_: unknown, info: PanInfo) {
    const d = detents()
    const projected = y.get() + info.velocity.y * 0.18
    const target =
      projected > (d.peek + d.closed) / 2 ? 'closed' : projected > d.peek / 2 ? 'peek' : 'full'
    const flick = Math.abs(info.velocity.y) > 600
    void animate(y, d[target], {
      type: 'spring',
      // Bounce only after a flick, per the house motion rules.
      bounce: flick && !reduced ? 0.15 : 0,
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
          <h2 id={`${id}-title`} className={styles.title} lang={titleLang}>
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
