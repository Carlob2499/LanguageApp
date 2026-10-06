import { Link } from '@/app/router/index'

import { useDueCounts } from '@/app/study/useDueCounts'
import { useSettings } from '@/app/study/settings'

import styles from './Today.module.css'

export function TodayRoute() {
  const counts = useDueCounts()
  const settings = useSettings((s) => s.settings)
  const newLeft = Math.max(0, settings.newPerDay - (counts?.today.newIntroduced ?? 0))
  const due = counts?.due ?? 0
  const hasWork = due > 0 || newLeft > 0

  return (
    <section className={styles.today} aria-labelledby="today-title">
      <p className={styles.eyebrow}>Today · {settings.level}</p>
      <h1 id="today-title">
        {counts === undefined
          ? 'Setting the table…'
          : due > 0
            ? `${due} to review.`
            : newLeft > 0
              ? 'Nothing due. Learn something new?'
              : 'All repaired for today.'}
      </h1>
      <p className={styles.lede}>
        {due > 0 && newLeft > 0
          ? `${due} reviews are waiting, with room for ${newLeft} new ${newLeft === 1 ? 'card' : 'cards'}.`
          : due > 0
            ? `${due} reviews are waiting. New cards are done for today.`
            : newLeft > 0
              ? `${newLeft} new ${newLeft === 1 ? 'card' : 'cards'} ready to meet.`
              : 'Come back tomorrow, or browse the library in the meantime.'}
      </p>
      <div className={styles.actions}>
        {hasWork ? (
          <Link to="/review" className={styles.primary}>
            {due > 0 ? 'Start reviewing' : 'Learn new cards'}
          </Link>
        ) : (
          <Link to="/library" className={styles.secondary}>
            Browse the library
          </Link>
        )}
      </div>
      <dl className={styles.stats}>
        <div>
          <dt>Cards met</dt>
          <dd>{counts?.learned ?? 0}</dd>
        </div>
        <div>
          <dt>Reviews today</dt>
          <dd>{counts?.today.reviewsDone ?? 0}</dd>
        </div>
        <div>
          <dt>New today</dt>
          <dd>
            {counts?.today.newIntroduced ?? 0}
            <span className={styles.of}> / {settings.newPerDay}</span>
          </dd>
        </div>
      </dl>
      <p className={`${styles.mark} ja-display`} lang="ja" aria-hidden="true">
        金継ぎ
      </p>
    </section>
  )
}
