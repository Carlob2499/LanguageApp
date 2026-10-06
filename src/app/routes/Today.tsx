import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'

import { Icon } from '@/app/components/Icon'
import { StrokeGlyph } from '@/app/components/StrokeGlyph'
import { Vessel } from '@/app/components/Vessel'
import { Link } from '@/app/router/index'
import { useSettings } from '@/app/study/settings'
import { useDueCounts } from '@/app/study/useDueCounts'
import { db, localDay } from '@/db'
import { loadKanji, strokesFor } from '@/packs/ja/loader'
import type { KanjiItem, StrokeItem } from '@/packs/ja/types'

import styles from './Today.module.css'

function useStreak(): number {
  return (
    useLiveQuery(async () => {
      const days = await db.days.toArray()
      const active = new Set(days.filter((d) => d.reviewsDone > 0).map((d) => d.day))
      let streak = 0
      const cursor = new Date()
      if (!active.has(localDay(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1)
      while (active.has(localDay(cursor.getTime()))) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      }
      return streak
    }, []) ?? 0
  )
}

export function TodayRoute() {
  const counts = useDueCounts()
  const settings = useSettings((s) => s.settings)
  const streak = useStreak()
  const [daily, setDaily] = useState<{ kanji: KanjiItem; strokes?: StrokeItem }>()
  const newLeft = Math.max(0, settings.newPerDay - (counts?.today.newIntroduced ?? 0))
  const due = counts?.due ?? 0
  const done = counts?.today.reviewsDone ?? 0
  const hasWork = due > 0 || newLeft > 0
  const target = due + done + newLeft
  const fill = target === 0 ? 1 : done / target

  useEffect(() => {
    let cancelled = false
    void loadKanji(settings.level).then(async (list) => {
      if (list.length === 0) return
      const dayIndex = Math.floor(Date.now() / 86_400_000)
      const kanji = list[dayIndex % list.length]!
      const strokes = await strokesFor(kanji.char, settings.level)
      if (!cancelled) setDaily(strokes ? { kanji, strokes } : { kanji })
    })
    return () => {
      cancelled = true
    }
  }, [settings.level])

  return (
    <section className={styles.today} aria-labelledby="today-title">
      <header className={styles.top}>
        <div>
          <p className={styles.eyebrow}>Today · {settings.level}</p>
          <h1 id="today-title">
            {counts === undefined
              ? 'Setting the table…'
              : due > 0
                ? `${due} to repair.`
                : newLeft > 0
                  ? 'Nothing due. Meet something new?'
                  : 'All repaired for today.'}
          </h1>
        </div>
        <Vessel
          fill={fill}
          seams={Math.min(6, Math.floor(done / 4))}
          size={88}
          label={`Today's vessel, ${Math.round(fill * 100)}% full`}
          className={styles.vessel}
        />
      </header>
      <p className={styles.lede}>
        {due > 0 && newLeft > 0
          ? `${due} reviews are waiting, with room for ${newLeft} new ${newLeft === 1 ? 'card' : 'cards'}.`
          : due > 0
            ? `${due} reviews are waiting. New cards are done for today.`
            : newLeft > 0
              ? `${newLeft} new ${newLeft === 1 ? 'card' : 'cards'} ready to meet.`
              : 'Come back tomorrow, or wander the library in the meantime.'}
      </p>
      <div className={styles.actions}>
        {hasWork ? (
          <Link to="/review" className={styles.primary}>
            {due > 0 ? 'Start reviewing' : 'Learn new cards'}
            <Icon name="chevron" size={20} />
          </Link>
        ) : (
          <Link to="/library" className={styles.secondary}>
            Browse the library
          </Link>
        )}
      </div>

      <dl className={styles.stats}>
        <div>
          <dt>Streak</dt>
          <dd>
            <span className={styles.ember} aria-hidden="true" />
            {streak}
            <span className={styles.of}> {streak === 1 ? 'day' : 'days'}</span>
          </dd>
        </div>
        <div>
          <dt>Reviews today</dt>
          <dd>{done}</dd>
        </div>
        <div>
          <dt>New today</dt>
          <dd>
            {counts?.today.newIntroduced ?? 0}
            <span className={styles.of}> / {settings.newPerDay}</span>
          </dd>
        </div>
      </dl>

      {daily && (
        <Link
          to={`/kanji/${encodeURIComponent(daily.kanji.char)}`}
          className={styles.daily}
          aria-label={`Kanji of the day: ${daily.kanji.char}, ${daily.kanji.meanings[0]}`}
        >
          <div className={styles.dailyGlyph}>
            {daily.strokes ? (
              <StrokeGlyph item={daily.strokes} speed={260} />
            ) : (
              <span className="ja-display" lang="ja">
                {daily.kanji.char}
              </span>
            )}
          </div>
          <div className={styles.dailyText}>
            <p className={styles.eyebrow}>Kanji of the day</p>
            <p className={styles.dailyMeaning}>{daily.kanji.meanings.slice(0, 3).join(' · ')}</p>
            <p className={styles.dailyReadings} lang="ja">
              {[...daily.kanji.on.slice(0, 2), ...daily.kanji.kun.slice(0, 2)].join('　')}
            </p>
            <p className={styles.dailyStrokes}>{daily.kanji.strokes} strokes · tap to study</p>
          </div>
        </Link>
      )}
    </section>
  )
}
