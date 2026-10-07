import { useEffect, useRef, useState } from 'react'

import { outCubic, seg } from '@/app/motion/ease'
import { reducedMotion } from '@/app/motion/tier'

/**
 * A number that counts up to its value in under a second, so a changed figure is noticed. Screen
 * readers and reduced-motion users get the final value at once; the count itself is time-based so
 * a slow frame rate cannot stretch it.
 */
export function CountUp({ value, ms = 700 }: { value: number; ms?: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (reducedMotion() || from.current === value) {
      from.current = value
      return
    }
    const start = performance.now()
    const origin = from.current
    let frame = 0
    const tick = (now: number) => {
      const t = outCubic(seg(now - start, 0, ms))
      setShown(Math.round(origin + (value - origin) * t))
      if (now - start < ms) frame = requestAnimationFrame(tick)
      else from.current = value
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, ms])

  return (
    <span>
      <span className="visually-hidden">{value}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  )
}
