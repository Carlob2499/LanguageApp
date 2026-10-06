import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'

import { Furigana } from '@/app/components/Furigana'
import { Link } from '@/app/router/index'
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
  const [query, setQuery] = useState('')
  const cards = useLiveQuery(() => db.cards.where('group').equals(level).toArray(), [level]) ?? []
  const byItem = new Map<string, StudyCard[]>()
  for (const c of cards) byItem.set(c.itemId, [...(byItem.get(c.itemId) ?? []), c])

  useEffect(() => {
    void Promise.all([loadKanji(level), loadVocab(level)]).then(([k, v]) => {
      setKanji(k)
      setVocab(v)
    })
  }, [level])

  function stateOf(itemId: string): StudyCard['state'] | undefined {
    const list = byItem.get(itemId)
    if (!list || list.length === 0) return undefined
    if (list.some((c) => c.state === 'relearning')) return 'relearning'
    if (list.every((c) => c.state === 'review')) return 'review'
    return 'learning'
  }

  const q = query.trim().toLowerCase()
  const kanjiShown = q
    ? kanji.filter(
        (k) =>
          k.char === q ||
          k.meanings.some((m) => m.includes(q)) ||
          k.on.includes(q) ||
          k.kun.some((r) => r.includes(q)),
      )
    : kanji
  const vocabShown = q
    ? vocab.filter(
        (v) =>
          v.forms.some((f) => f.text.includes(q)) ||
          v.readings.some((r) => r.text.includes(q)) ||
          v.senses.some((s) => s.gloss.some((g) => g.toLowerCase().includes(q))),
      )
    : vocab

  return (
    <section className={styles.library} aria-labelledby="library-title">
      <h1 id="library-title">Library · {level}</h1>
      <p className={styles.lede}>
        {kanji.length} kanji and {vocab.length} words at this level. Levels are unofficial
        estimates.
      </p>
      <div className={styles.toolbar}>
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
        <label className={styles.search}>
          <span className="visually-hidden">Search this level</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className={styles.searchInput}
            lang="ja"
          />
        </label>
      </div>
      {tab === 'kanji' ? (
        <ul className={styles.grid} role="list">
          {kanjiShown.map((k) => {
            const state = stateOf(k.id)
            return (
              <li key={k.id}>
                <Link
                  to={`/kanji/${encodeURIComponent(k.char)}`}
                  className={styles.cell}
                  data-state={state}
                >
                  <span className={`${styles.glyph} ja-display`} lang="ja">
                    {k.char}
                  </span>
                  <span className={styles.gloss}>{k.meanings[0]}</span>
                  {state && <span className={styles.badge}>{STATE_LABEL[state]}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className={styles.list} role="list">
          {vocabShown.map((v) => {
            const form = displayForm(v)
            const state = stateOf(v.id)
            return (
              <li key={v.id} className={styles.row} data-state={state}>
                <span className={styles.word}>
                  <Furigana text={form} reading={readingsFor(v, form)[0]} show="always" />
                </span>
                <span className={styles.gloss}>{primaryGloss(v)}</span>
                {state && <span className={styles.badge}>{STATE_LABEL[state]}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
