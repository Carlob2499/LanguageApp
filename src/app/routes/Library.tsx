import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'

import { Furigana } from '@/app/components/Furigana'
import { KanjiStudy } from '@/app/components/KanjiStudy'
import { SPLIT_QUERY, useMediaQuery } from '@/app/hooks/useMediaQuery'
import { Link, useNavigate } from '@/app/router/index'
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
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<string>()
  const split = useMediaQuery(SPLIT_QUERY)
  const navigate = useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
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

  const shownCount = tab === 'kanji' ? kanjiShown.length : vocabShown.length
  const at = Math.min(cursor, Math.max(0, shownCount - 1))
  const focusedKanji = tab === 'kanji' ? kanjiShown[at]?.char : vocabShown[at]?.kanji[0]
  const paneChar = selected ?? focusedKanji

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const typing =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
      if (event.key === '/' && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (typing) {
        if (event.key === 'Escape') (event.target as HTMLElement).blur()
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === 'j' || key === 'k') {
        event.preventDefault()
        const next = Math.max(0, Math.min(shownCount - 1, at + (key === 'j' ? 1 : -1)))
        setCursor(next)
        setSelected(undefined)
        listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
      } else if (event.key === 'Enter' && focusedKanji) {
        navigate(`/kanji/${encodeURIComponent(focusedKanji)}`)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [at, shownCount, focusedKanji, navigate])

  return (
    <section
      className={styles.library}
      aria-labelledby="library-title"
      data-split={split ? 'true' : undefined}
    >
      <div className={styles.listPane}>
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
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setCursor(0)
              }}
              placeholder="Search"
              className={styles.searchInput}
              lang="ja"
            />
          </label>
        </div>
        {tab === 'kanji' ? (
          <ul className={styles.grid} role="list" ref={listRef}>
            {kanjiShown.map((k, i) => {
              const state = stateOf(k.id)
              return (
                <li key={k.id}>
                  <Link
                    to={`/kanji/${encodeURIComponent(k.char)}`}
                    className={styles.cell}
                    data-state={state}
                    data-cursor={split && i === at ? 'true' : undefined}
                    aria-current={split && paneChar === k.char ? 'true' : undefined}
                    onClick={(e) => {
                      if (!split) return
                      e.preventDefault()
                      setCursor(i)
                      setSelected(k.char)
                    }}
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
          <ul className={styles.list} role="list" ref={listRef}>
            {vocabShown.map((v, i) => {
              const form = displayForm(v)
              const state = stateOf(v.id)
              return (
                <li
                  key={v.id}
                  className={styles.row}
                  data-state={state}
                  data-cursor={split && i === at ? 'true' : undefined}
                  onClick={() => {
                    if (!split) return
                    setCursor(i)
                    setSelected(v.kanji[0])
                  }}
                >
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
      </div>
      {split && (
        <aside className={styles.pane} aria-label="Selected kanji" data-testid="library-pane">
          {paneChar ? (
            <KanjiStudy key={paneChar} char={paneChar} embedded />
          ) : (
            <p className={styles.paneEmpty}>
              Pick a kanji, or move with <kbd>J</kbd> and <kbd>K</kbd>.
            </p>
          )}
        </aside>
      )}
    </section>
  )
}
