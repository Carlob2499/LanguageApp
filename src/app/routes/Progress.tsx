import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'

import { CountUp } from '@/app/components/CountUp'
import { Vessel } from '@/app/components/Vessel'
import { Link } from '@/app/router/index'
import { useSettings } from '@/app/study/settings'
import { db, localDay } from '@/db'
import { LEVELS, type Level } from '@/packs/ja/levels'
import { loadIndex, loadKanji } from '@/packs/ja/loader'
import type { KanjiItem } from '@/packs/ja/types'

import styles from './Progress.module.css'

const WEEKS = 12

export function ProgressRoute() {
  const level = useSettings((s) => s.settings.level)
  const [totals, setTotals] = useState<Record<string, number>>({})
  const [levelKanji, setLevelKanji] = useState<KanjiItem[]>([])

  useEffect(() => {
    let cancelled = false
    void loadKanji(level).then((k) => !cancelled && setLevelKanji(k))
    return () => {
      cancelled = true
    }
  }, [level])
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
  const todayKey = localDay(today.getTime())
  const activeDays = grid.filter((g) => g.count > 0).length
  // Month labels sit above the first column (week) that starts in a new month.
  const months: Array<{ col: number; label: string }> = []
  for (let col = 0; col < WEEKS; col++) {
    const first = grid[col * 7]
    if (!first) continue
    const d = new Date(`${first.day}T00:00:00`)
    const prev = col > 0 ? new Date(`${grid[(col - 1) * 7]!.day}T00:00:00`) : undefined
    if (!prev || prev.getMonth() !== d.getMonth())
      months.push({ col, label: d.toLocaleDateString(undefined, { month: 'short' }) })
  }

  // Kanji mosaic: the state of each kanji in the current level, from its meaning card.
  const kanjiState = new Map<string, 'learning' | 'repaired' | 'cracked'>()
  for (const c of cards) {
    if (c.cardType !== 'kanji-meaning') continue
    kanjiState.set(
      c.itemId,
      c.state === 'relearning'
        ? 'cracked'
        : c.state === 'review' && c.stability >= 7
          ? 'repaired'
          : 'learning',
    )
  }
  const mosaicCounts = { learning: 0, repaired: 0, cracked: 0 }
  for (const k of levelKanji) {
    const st = kanjiState.get(k.id)
    if (st) mosaicCounts[st]++
  }
  const totalReviews = days.reduce((n, d) => n + d.reviewsDone, 0)
  const minutes = Math.round(days.reduce((n, d) => n + d.timeMs, 0) / 60_000)

  return (
    <section className={styles.progress} aria-labelledby="progress-title">
      <h1 id="progress-title">Progress</h1>
      <p className={styles.lede}>
        Each bowl is a level. It fills as items reach long-term memory, and each mistake you recover
        from adds a gold seam.
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
                label={`${l}: ${b.repaired.size} of ${total} known`}
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
          <dd>
            <CountUp value={totalReviews} />
          </dd>
        </div>
        <div>
          <dt>Minutes</dt>
          <dd>
            <CountUp value={minutes} />
          </dd>
        </div>
        <div>
          <dt>Mistakes recovered</dt>
          <dd>
            <CountUp value={cards.filter((c) => c.lapses > 0 && c.state === 'review').length} />
          </dd>
        </div>
      </dl>

      <section aria-labelledby="mosaic-title" className={styles.heatBlock}>
        <h2 id="mosaic-title" className={styles.blockTitle}>
          {level} kanji
        </h2>
        <p className={styles.legendLine}>
          <span className={styles.key} data-state="repaired" /> {mosaicCounts.repaired} known
          <span className={styles.key} data-state="learning" /> {mosaicCounts.learning} learning
          <span className={styles.key} data-state="cracked" /> {mosaicCounts.cracked} cracked
          <span className={styles.key} />{' '}
          {levelKanji.length - mosaicCounts.repaired - mosaicCounts.learning - mosaicCounts.cracked}{' '}
          not met
        </p>
        <ul className={styles.mosaic} role="list">
          {levelKanji.map((k, idx) => {
            const st = kanjiState.get(k.id)
            return (
              <li key={k.id} style={{ '--i': Math.min(idx, 40) } as React.CSSProperties}>
                <Link
                  to={`/kanji/${encodeURIComponent(k.char)}`}
                  className={styles.tileK}
                  data-state={st}
                  aria-label={`${k.char}, ${k.meanings[0] ?? ''}, ${st ?? 'not met yet'}`}
                >
                  <span lang="ja">{k.char}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="heat-title" className={styles.heatBlock}>
        <h2 id="heat-title" className={styles.blockTitle}>
          Last {WEEKS} weeks
        </h2>
        <div className={styles.heatWrap}>
          <div className={styles.months} aria-hidden="true">
            {months.map((m) => (
              <span key={m.col} style={{ gridColumn: m.col + 1 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div
            className={styles.heat}
            role="img"
            aria-label={`Review activity over the last ${WEEKS} weeks: ${activeDays} active days, ${totalReviews} reviews in all`}
          >
            {grid.map((g, i) => (
              <span
                key={g.day}
                className={styles.cell}
                data-empty={g.count === 0 ? 'true' : undefined}
                data-today={g.day === todayKey ? 'true' : undefined}
                style={
                  {
                    '--i': i,
                    ...(g.count === 0 ? {} : { opacity: 0.35 + 0.65 * (g.count / max) }),
                  } as React.CSSProperties
                }
                title={`${g.day}: ${g.count} reviews`}
              />
            ))}
          </div>
          <p className={styles.legendLine} aria-hidden="true">
            Less
            <span className={styles.cell} data-empty="true" />
            <span className={styles.cell} style={{ opacity: 0.45 }} />
            <span className={styles.cell} style={{ opacity: 0.7 }} />
            <span className={styles.cell} />
            More
          </p>
        </div>
      </section>
    </section>
  )
}
