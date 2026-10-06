import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { useNavigate } from '@/app/router/index'
import { useSettings } from '@/app/study/settings'
import { displayForm, primaryGloss, readingsFor } from '@/packs/ja/cards'
import { LEVELS } from '@/packs/ja/levels'
import { loadKanji, loadVocab } from '@/packs/ja/loader'
import type { KanjiItem, VocabItem } from '@/packs/ja/types'

import { Icon, type IconName } from './Icon'
import styles from './Palette.module.css'
import { SHORTCUTS } from './shortcuts'

interface Command {
  id: string
  label: string
  hint?: string
  icon: IconName
  keywords: string
  run: () => void
}

interface Result {
  id: string
  kind: 'command' | 'kanji' | 'word'
  label: string
  detail: string
  icon?: IconName
  ja?: string
  run: () => void
}

const JA = /[぀-ヿ一-鿿]/

function isJapanese(text: string): boolean {
  return JA.test(text)
}

/** All levels' items, loaded once on the first search and kept for the session. */
let everything: Promise<{ kanji: KanjiItem[]; vocab: VocabItem[] }> | undefined
function loadEverything() {
  everything ??= Promise.all([
    Promise.all(LEVELS.map((l) => loadKanji(l))),
    Promise.all(LEVELS.map((l) => loadVocab(l))),
  ]).then(([k, v]) => ({ kanji: k.flat(), vocab: v.flat() }))
  return everything
}

function searchItems(
  q: string,
  data: { kanji: KanjiItem[]; vocab: VocabItem[] },
  limit = 6,
): { kanji: KanjiItem[]; vocab: VocabItem[] } {
  const lower = q.toLowerCase()
  const ja = isJapanese(q)
  const kanji = data.kanji
    .filter((k) =>
      ja
        ? k.char === q || k.on.some((r) => r.startsWith(q)) || k.kun.some((r) => r.startsWith(q))
        : k.meanings.some((m) => m.startsWith(lower)),
    )
    .sort((a, b) => (a.freq ?? 9999) - (b.freq ?? 9999))
    .slice(0, limit)
  const vocab = data.vocab
    .filter((v) =>
      ja
        ? v.forms.some((f) => f.text.startsWith(q)) || v.readings.some((r) => r.text.startsWith(q))
        : v.senses.some((s) => s.gloss.some((g) => g.toLowerCase().startsWith(lower))),
    )
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
  return { kanji, vocab }
}

export interface PaletteProps {
  onClose: () => void
  /** Opens straight on the shortcut list. */
  initialView?: 'search' | 'shortcuts'
}

/**
 * Command palette: jump to any kanji or word on the lists, start a session, change the theme,
 * read the shortcuts. Arrow keys move, Enter runs, Escape closes. Loaded only when opened.
 */
export function Palette({ onClose, initialView = 'search' }: PaletteProps) {
  const navigate = useNavigate()
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const [query, setQuery] = useState('')
  const [view, setView] = useState(initialView)
  const [active, setActive] = useState(0)
  const [found, setFound] = useState<{ q: string; kanji: KanjiItem[]; vocab: VocabItem[] }>()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    return () => previous?.focus()
  }, [])

  useEffect(() => {
    if (view === 'search') inputRef.current?.focus()
  }, [view])

  // Escape closes even when focus has wandered off the dialog.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (view === 'shortcuts') setView('search')
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, onClose])

  const go = useCallback(
    (to: string) => {
      onClose()
      navigate(to)
    },
    [onClose, navigate],
  )

  const commands = useMemo<Command[]>(
    () => [
      {
        id: 'review',
        label: 'Start a session',
        icon: 'today',
        keywords: 'review study learn start session',
        run: () => go('/review'),
      },
      {
        id: 'today',
        label: 'Today',
        icon: 'today',
        keywords: 'home today due',
        run: () => go('/'),
      },
      {
        id: 'library',
        label: 'Library',
        icon: 'library',
        keywords: 'library browse kanji words',
        run: () => go('/library'),
      },
      {
        id: 'kana',
        label: 'Kana table',
        icon: 'strokes',
        keywords: 'kana hiragana katakana table',
        run: () => go('/kana'),
      },
      {
        id: 'progress',
        label: 'Progress',
        icon: 'progress',
        keywords: 'progress streak vessels stats',
        run: () => go('/progress'),
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: 'settings',
        keywords: 'settings level theme backup',
        run: () => go('/settings'),
      },
      {
        id: 'sources',
        label: 'Sources and credits',
        icon: 'sources',
        keywords: 'about sources credits licence data',
        run: () => go('/about'),
      },
      {
        id: 'theme',
        label: 'Switch theme',
        hint:
          settings.theme === 'auto'
            ? 'auto → dark'
            : settings.theme === 'dark'
              ? 'dark → paper'
              : 'paper → auto',
        icon: 'spark',
        keywords: 'theme dark light paper appearance',
        run: () => {
          const next =
            settings.theme === 'auto' ? 'dark' : settings.theme === 'dark' ? 'light' : 'auto'
          void update({ theme: next })
          onClose()
        },
      },
      {
        id: 'shortcuts',
        label: 'Keyboard shortcuts',
        icon: 'keyboard',
        keywords: 'keyboard shortcuts keys help ?',
        run: () => setView('shortcuts'),
      },
    ],
    [settings.theme, go, onClose, update],
  )

  const q = query.trim()
  useEffect(() => {
    if (!q) return
    let cancelled = false
    void loadEverything().then((data) => {
      if (cancelled) return
      setFound({ q, ...searchItems(q, data) })
    })
    return () => {
      cancelled = true
    }
  }, [q])

  const results = useMemo<Result[]>(() => {
    const lower = q.toLowerCase()
    // Commands whose name matches come before keyword-only matches ("theme" → Switch theme first).
    const rank = (c: Command) =>
      !q ? 0 : c.label.toLowerCase().includes(lower) ? 0 : c.keywords.includes(lower) ? 1 : 2
    const cmds = commands
      .filter((c) => rank(c) < 2)
      .sort((a, b) => rank(a) - rank(b))
      .map<Result>((c) => ({
        id: `c:${c.id}`,
        kind: 'command',
        label: c.label,
        detail: c.hint ?? '',
        icon: c.icon,
        run: c.run,
      }))
    if (!q || found?.q !== q) return cmds
    // A command named like the query outranks items; keyword-only commands trail them.
    const named = cmds.filter(
      (_, i) => rank(commands.find((c) => `c:${c.id}` === cmds[i]!.id)!) === 0,
    )
    const trailing = cmds.filter((c) => !named.includes(c))
    const kanji = found.kanji.map<Result>((k) => ({
      id: k.id,
      kind: 'kanji',
      label: k.meanings.slice(0, 2).join(', '),
      detail: `${k.level} · ${[...k.on.slice(0, 1), ...k.kun.slice(0, 1)].join('　')}`,
      ja: k.char,
      run: () => go(`/kanji/${encodeURIComponent(k.char)}`),
    }))
    const words = found.vocab.map<Result>((v) => {
      const form = displayForm(v)
      const first = v.kanji[0]
      return {
        id: v.id,
        kind: 'word',
        label: primaryGloss(v),
        detail: `${v.level} · ${readingsFor(v, form)[0] ?? ''}`,
        ja: form,
        run: () => (first ? go(`/kanji/${encodeURIComponent(first)}`) : go('/library')),
      }
    })
    return [...named, ...kanji, ...words, ...trailing]
  }, [q, found, commands, go])

  const current = Math.min(active, Math.max(0, results.length - 1))

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(Math.min(results.length - 1, current + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(Math.max(0, current - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      results[current]?.run()
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={view === 'shortcuts' ? 'Keyboard shortcuts' : 'Command palette'}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKey}
      >
        {view === 'shortcuts' ? (
          <div className={styles.shortcuts}>
            <p className={styles.eyebrow}>Keyboard shortcuts</p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Keys</th>
                  <th scope="col">Does</th>
                  <th scope="col">Where</th>
                </tr>
              </thead>
              <tbody>
                {SHORTCUTS.map((s) => (
                  <tr key={s.keys + s.where}>
                    <td>
                      <kbd className={styles.kbd}>{s.keys}</kbd>
                    </td>
                    <td>{s.does}</td>
                    <td className={styles.where}>{s.where}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className={styles.back}
              ref={(el) => el?.focus()}
              onClick={() => setView('search')}
            >
              Back to search
            </button>
          </div>
        ) : (
          <>
            <div className={styles.inputRow}>
              <Icon name="spark" size={18} className={styles.inputIcon} />
              <input
                ref={inputRef}
                className={styles.input}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                placeholder="Jump to a kanji or word, or type a command"
                aria-label="Search kanji, words and commands"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={results[current] ? `${listId}-${current}` : undefined}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className={styles.kbd}>esc</kbd>
            </div>
            <ul id={listId} role="listbox" className={styles.list} aria-label="Results">
              {results.length === 0 && (
                <li className={styles.empty} role="option" aria-selected="false">
                  {found?.q === q ? 'Nothing on the lists matches that.' : 'Searching…'}
                </li>
              )}
              {results.map((r, i) => (
                <li
                  key={r.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === current}
                  className={styles.item}
                  data-kind={r.kind}
                  onMouseEnter={() => setActive(i)}
                  onClick={r.run}
                >
                  {r.ja ? (
                    <span className={styles.ja} lang="ja">
                      {r.ja}
                    </span>
                  ) : (
                    <Icon name={r.icon ?? 'spark'} size={18} className={styles.itemIcon} />
                  )}
                  <span className={styles.label}>{r.label}</span>
                  <span className={styles.detail} lang={r.kind === 'command' ? undefined : 'ja'}>
                    {r.detail}
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.foot}>
              <kbd className={styles.kbd}>↑↓</kbd> move · <kbd className={styles.kbd}>↵</kbd> open ·{' '}
              <kbd className={styles.kbd}>?</kbd> shortcuts
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default Palette
