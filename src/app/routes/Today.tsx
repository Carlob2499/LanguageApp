import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'

import { Icon } from '@/app/components/Icon'
import { StrokeGlyph } from '@/app/components/StrokeGlyph'
import { Vessel } from '@/app/components/Vessel'
import { CountUp } from '@/app/components/CountUp'
import { Link } from '@/app/router/index'
import { kanaLessonOrder } from '@/app/study/library'
import { useSettings } from '@/app/study/settings'
import { useDueCounts } from '@/app/study/useDueCounts'
import { db, localDay } from '@/db'
import { loadKana, loadKanji, loadStrokes, strokesFor } from '@/packs/ja/loader'
import type { Level } from '@/packs/ja/levels'
import type { KanaItem, KanjiItem, StrokeItem } from '@/packs/ja/types'

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

type Spotlight =
  | { kind: 'kanji'; kanji: KanjiItem; strokes?: StrokeItem }
  | { kind: 'kana'; kana: KanaItem; strokes?: StrokeItem }

/** One item per calendar day: a kanji from the current level, or a hiragana while kana come first. */
async function loadSpotlight(level: Level, kanaReady: boolean): Promise<Spotlight | undefined> {
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  if (!kanaReady) {
    const [kanaList, strokeList] = await Promise.all([loadKana(), loadStrokes('kana')])
    const order = kanaLessonOrder(kanaList).filter((k) => k.script === 'hiragana')
    const kana = order[dayIndex % Math.max(1, order.length)]
    if (!kana) return undefined
    const strokes = strokeList.find((s) => s.char === kana.char)
    return strokes ? { kind: 'kana', kana, strokes } : { kind: 'kana', kana }
  }
  const list = await loadKanji(level)
  const kanji = list[dayIndex % Math.max(1, list.length)]
  if (!kanji) return undefined
  const strokes = await strokesFor(kanji.char, level)
  return strokes ? { kind: 'kanji', kanji, strokes } : { kind: 'kanji', kanji }
}

export function TodayRoute() {
  const counts = useDueCounts()
  const settings = useSettings((s) => s.settings)
  const streak = useStreak()
  const [daily, setDaily] = useState<Spotlight>()
  const newLeft = Math.max(0, settings.newPerDay - (counts?.today.newIntroduced ?? 0))
  const due = counts?.due ?? 0
  const done = counts?.today.reviewsDone ?? 0
  const hasWork = due > 0 || newLeft > 0
  const target = due + done + newLeft
  const fill = target === 0 ? 1 : done / target

  useEffect(() => {
    let cancelled = false
    void loadSpotlight(settings.level, settings.kanaReady).then((s) => {
      if (!cancelled && s) setDaily(s)
    })
    return () => {
      cancelled = true
    }
  }, [settings.level, settings.kanaReady])

  return (
    <section className={styles.today} aria-labelledby="today-title">
      <div className={styles.lead}>
        <header className={styles.top}>
          <div>
            <p className={styles.eyebrow}>
              Today · {settings.kanaReady ? settings.level : 'Kana first'}
            </p>
            <h1 id="today-title">
              {counts === undefined
                ? 'Loading your cards…'
                : due > 0
                  ? `${due} ${due === 1 ? 'card' : 'cards'} due.`
                  : newLeft > 0
                    ? 'Nothing due. Learn something new?'
                    : 'All done for today.'}
            </h1>
          </div>
          <Vessel
            fill={fill}
            seams={Math.min(6, Math.floor(done / 4))}
            size={88}
            label={`Today's bowl, ${Math.round(fill * 100)}% full`}
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
                : 'Come back tomorrow, or browse the library.'}
        </p>
        <div className={styles.actions}>
          {!settings.kanaReady && (
            <Link to="/kana" className={styles.secondary}>
              Kana table
            </Link>
          )}
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
              <CountUp value={streak} />
              <span className={styles.of}> {streak === 1 ? 'day' : 'days'}</span>
            </dd>
          </div>
          <div>
            <dt>Reviews today</dt>
            <dd>
              <CountUp value={done} />
            </dd>
          </div>
          <div>
            <dt>New today</dt>
            <dd>
              <CountUp value={counts?.today.newIntroduced ?? 0} />
              <span className={styles.of}> / {settings.newPerDay}</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className={styles.side}>
        {daily && daily.kind === 'kanji' && (
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
        {daily && daily.kind === 'kana' && (
          <Link
            to="/kana"
            className={styles.daily}
            aria-label={`Kana of the day: ${daily.kana.char}, ${daily.kana.romaji}`}
          >
            <div className={styles.dailyGlyph}>
              {daily.strokes ? (
                <StrokeGlyph item={daily.strokes} speed={320} />
              ) : (
                <span className="ja-display" lang="ja">
                  {daily.kana.char}
                </span>
              )}
            </div>
            <div className={styles.dailyText}>
              <p className={styles.eyebrow}>Kana of the day</p>
              <p className={styles.dailyMeaning}>{daily.kana.romaji}</p>
              <p className={styles.dailyReadings} lang="ja">
                {daily.kana.script} ·{' '}
                {daily.kana.pair ? `counterpart ${daily.kana.pair}` : 'no counterpart'}
              </p>
              <p className={styles.dailyStrokes}>Tap for the whole table</p>
            </div>
          </Link>
        )}
      </div>
    </section>
  )
}
