import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'

import { useSettings } from '@/app/study/settings'
import { db } from '@/db'
import type { StudyCard } from '@/engine/types'
import { displayForm, primaryGloss, readingsFor } from '@/packs/ja/cards'
import { loadKanji, loadVocab } from '@/packs/ja/loader'
import type { KanjiItem, VocabItem } from '@/packs/ja/types'

import styles from './Library.module.css'

const STATE_LABEL: Record<StudyCard['state'], string> = {
  new: 'Met',
  learning: 'Learning',
  review: 'Repaired',
  relearning: 'Cracked',
}

export function LibraryRoute() {
  const level = useSettings((s) => s.settings.level)
  const [kanji, setKanji] = useState<KanjiItem[]>([])
  const [vocab, setVocab] = useState<VocabItem[]>([])
  const [tab, setTab] = useState<'kanji' | 'vocab'>('kanji')
  const cards = useLiveQuery(() => db.cards.where('group').equals(level).toArray(), [level]) ?? []
  const byItem = new Map<string, StudyCard[]>()
  for (const c of cards) byItem.set(c.itemId, [...(byItem.get(c.itemId) ?? []), c])

  useEffect(() => {
    void Promise.all([loadKanji(level), loadVocab(level)]).then(([k, v]) => {
      setKanji(k)
      setVocab(v)
    })
  }, [level])

  function badge(itemId: string) {
    const list = byItem.get(itemId)
    if (!list || list.length === 0) return null
    const worst = list.some((c) => c.state === 'relearning')
      ? 'relearning'
      : list.every((c) => c.state === 'review')
        ? 'review'
        : 'learning'
    return <span className={`${styles.badge} ${styles[worst]}`}>{STATE_LABEL[worst]}</span>
  }

  return (
    <section className={styles.library} aria-labelledby="library-title">
      <h1 id="library-title">Library · {level}</h1>
      <p className={styles.lede}>
        {kanji.length} kanji and {vocab.length} words at this level. Levels are unofficial
        estimates.
      </p>
      <div className={styles.tabs} role="tablist" aria-label="Item type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'kanji'}
          className={styles.tab}
          onClick={() => setTab('kanji')}
        >
          Kanji
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'vocab'}
          className={styles.tab}
          onClick={() => setTab('vocab')}
        >
          Words
        </button>
      </div>
      {tab === 'kanji' ? (
        <ul className={styles.grid} role="list">
          {kanji.map((k) => (
            <li key={k.id} className={styles.cell}>
              <span className={`${styles.glyph} ja-display`} lang="ja">
                {k.char}
              </span>
              <span className={styles.gloss}>{k.meanings[0]}</span>
              {badge(k.id)}
            </li>
          ))}
        </ul>
      ) : (
        <ul className={styles.list} role="list">
          {vocab.map((v) => {
            const form = displayForm(v)
            return (
              <li key={v.id} className={styles.row}>
                <span className={styles.word} lang="ja">
                  {form}
                  <span className={styles.wordReading}>{readingsFor(v, form)[0]}</span>
                </span>
                <span className={styles.gloss}>{primaryGloss(v)}</span>
                {badge(v.id)}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
