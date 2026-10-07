import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react'
import { useEffect, type ReactNode } from 'react'

import styles from './Tile.module.css'

export interface TileProps {
  children: ReactNode
  /** Swipe right = good, left = again. Disabled until the answer is revealed. */
  swipeEnabled: boolean
  onSwipe: (direction: 'again' | 'good') => void
  /** Cards that have lapsed before carry a crack; the gold fills as they recover. */
  seamProgress: number
  cardKey: string
}

const COMMIT_FRACTION = 0.4
const FLICK_VELOCITY = 600

export function Tile({ children, swipeEnabled, onSwipe, cardKey }: TileProps) {
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-240, 0, 240], [-6, 0, 6])
  const goodGlow = useTransform(x, [0, 160], [0, 1])
  const againGlow = useTransform(x, [-160, 0], [1, 0])

  useEffect(() => {
    x.set(0)
  }, [cardKey, x])

  function onDragEnd(_event: unknown, info: PanInfo) {
    const width = Math.max(240, (typeof window !== 'undefined' ? window.innerWidth : 360) * 0.86)
    const commit =
      Math.abs(info.offset.x) > width * COMMIT_FRACTION ||
      Math.abs(info.velocity.x) > FLICK_VELOCITY
    if (commit) {
      const direction = info.offset.x > 0 ? 'good' : 'again'
      const exit = direction === 'good' ? width * 1.2 : -width * 1.2
      void animate(x, exit, {
        type: 'spring',
        bounce: 0,
        duration: 0.35,
        velocity: info.velocity.x,
      }).then(() => {
        onSwipe(direction)
        x.set(0)
      })
    } else {
      void animate(x, 0, { type: 'spring', bounce: 0.2, duration: 0.4, velocity: info.velocity.x })
    }
  }

  return (
    <div className={styles.stage}>
      <motion.div className={styles.glowGood} style={{ opacity: goodGlow }} aria-hidden="true" />
      <motion.div className={styles.glowAgain} style={{ opacity: againGlow }} aria-hidden="true" />
      <motion.div
        className={styles.tile}
        data-tile=""
        style={{ x, rotate: reduced ? 0 : rotate }}
        drag={swipeEnabled ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        {...(swipeEnabled && !reduced ? { whileTap: { scale: 0.995 } } : {})}
      >
        <div className={styles.gloss} aria-hidden="true" />
        {children}
      </motion.div>
    </div>
  )
}
