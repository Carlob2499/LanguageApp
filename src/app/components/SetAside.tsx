import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'

import { db, withReopen } from '@/db'
import { displayForm } from '@/packs/ja/cards'
import { LEVELS, type Level } from '@/packs/ja/levels'
import { loadVocab } from '@/packs/ja/loader'

import { Button } from './Button'
import styles from './SetAside.module.css'

/** Cards the learner set aside as leeches, with a way back into the queue. */
export function SetAside() {
  const cards = useLiveQuery(() => db.cards.filter((c) => c.suspended === true).toArray(), []) ?? []
  const [words, setWords] = useState<Map<string, string>>(new Map())
  const groups = [...new Set(cards.filter((c) => c.itemId.startsWith('v:')).map((c) => c.group))]
    .filter((g): g is Level => (LEVELS as readonly string[]).includes(g))
    .sort()
    .join(',')

  useEffect(() => {
    if (!groups) return
    let cancelled = false
    void Promise.all(groups.split(',').map((g) => loadVocab(g as Level)))
      .then((lists) => {
        if (!cancelled) setWords(new Map(lists.flat().map((v) => [v.id, displayForm(v)])))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [groups])

  async function restore(key: string) {
    await withReopen(async () => {
      const row = await db.cards.get(key)
      if (row) await db.cards.put({ ...row, suspended: false, modifiedAt: Date.now() })
    })
  }

  if (cards.length === 0) {
    return (
      <p className={styles.empty}>
        Nothing set aside. Cards that keep cracking can be set aside from a review and brought back
        here.
      </p>
    )
  }
  return (
    <ul className={styles.list} role="list">
      {cards.map((c) => (
        <li key={c.key} className={styles.row}>
          <span lang="ja" className={styles.item}>
            {words.get(c.itemId) ?? c.itemId.replace(/^(k|kana):/, '')}
          </span>
          <span className={styles.meta}>
            {c.group} · cracked {c.lapses} times
          </span>
          <Button variant="quiet" onClick={() => void restore(c.key)}>
            Bring back
          </Button>
        </li>
      ))}
    </ul>
  )
}
