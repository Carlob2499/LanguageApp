import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'

import { Vessel } from '@/app/components/Vessel'
import { useSettings } from '@/app/study/settings'
import { db, localDay } from '@/db'
import { LEVELS, type Level } from '@/packs/ja/levels'
import { loadIndex } from '@/packs/ja/loader'

import styles from './Progress.module.css'

const WEEKS = 12

export function ProgressRoute() {
  const level = useSettings((s) => s.settings.level)
  const [totals, setTotals] = useState<Record<string, number>>({})
  const cards = useLiveQuery(() => db.cards.toArray(), []) ?? []
  const days = useLiveQuery(() => db.days.toArray(), []) ?? []

  useEffect(() => {
    void loadIndex().then((index) => {
      const next: Record<string, number> = {}
      for (const l of LEVELS)
        next[l] = (index.counts['kanji']?.[l] ?? 0) + (index.counts['vocab']?.[l] ?? 0)
      setTotals(next)
    })
  }, [])

  const byLevel = new Map<Level, { met: Set<string>; repaired: Set<string>; lapses: number }>()
  for (const l of LEVELS) byLevel.set(l, { met: new Set(), repaired: new Set(), lapses: 0 })
  for (const c of cards) {
    const bucket = byLevel.get(c.group as Level)
    if (!bucket) continue
    bucket.met.add(c.itemId)
    if (c.state === 'review' && c.stability >= 7) bucket.repaired.add(c.itemId)
    bucket.lapses += c.lapses
  }

  const byDay = new Map(days.map((d) => [d.day, d]))
  const today = new Date()
  const grid: Array<{ day: string; count: number }> = []
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = localDay(d.getTime())
    grid.push({ day: key, count: byDay.get(key)?.reviewsDone ?? 0 })
  }
  const max = Math.max(1, ...grid.map((g) => g.count))
  const totalReviews = days.reduce((n, d) => n + d.reviewsDone, 0)
  const minutes = Math.round(days.reduce((n, d) => n + d.timeMs, 0) / 60_000)

  return (
    <section className={styles.progress} aria-labelledby="progress-title">
      <h1 id="progress-title">Progress</h1>
      <p className={styles.lede}>
        Each vessel is a level. It fills as items settle into long-term memory, and every repaired
        lapse leaves a gold seam.
      </p>

      <ul className={styles.shelf} role="list">
        {LEVELS.map((l) => {
          const b = byLevel.get(l)!
          const total = totals[l] ?? 0
          const fill = total === 0 ? 0 : b.repaired.size / total
          return (
            <li
              key={l}
              className={styles.vesselItem}
              data-current={l === level ? 'true' : undefined}
            >
              <Vessel
                fill={fill}
                seams={Math.min(6, b.lapses)}
                size={96}
                label={`${l}: ${b.repaired.size} of ${total} repaired`}
              />
              <span className={styles.vesselLevel}>{l}</span>
              <span className={styles.vesselCount}>
                {b.repaired.size}
                <span className={styles.of}> / {total}</span>
              </span>
              <span className={styles.vesselMet}>{b.met.size} met</span>
            </li>
          )
        })}
      </ul>

      <dl className={styles.stats}>
        <div>
          <dt>Reviews</dt>
          <dd>{totalReviews}</dd>
        </div>
        <div>
          <dt>Minutes</dt>
          <dd>{minutes}</dd>
        </div>
        <div>
          <dt>Lapses repaired</dt>
          <dd>{cards.filter((c) => c.lapses > 0 && c.state === 'review').length}</dd>
        </div>
      </dl>

      <section aria-labelledby="heat-title" className={styles.heatBlock}>
        <h2 id="heat-title" className={styles.blockTitle}>
          Last {WEEKS} weeks
        </h2>
        <div
          className={styles.heat}
          role="img"
          aria-label={`Review activity over the last ${WEEKS} weeks`}
        >
          {grid.map((g) => (
            <span
              key={g.day}
              className={styles.cell}
              style={{ opacity: g.count === 0 ? 0.12 : 0.35 + 0.65 * (g.count / max) }}
              title={`${g.day}: ${g.count} reviews`}
            />
          ))}
        </div>
      </section>
    </section>
  )
}
