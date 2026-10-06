import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/app/components/Button'
import { Icon } from '@/app/components/Icon'
import { Speak } from '@/app/components/Speak'
import { StrokeGlyph } from '@/app/components/StrokeGlyph'
import { Link } from '@/app/router/index'
import { kanaLessonOrder } from '@/app/study/library'
import { useSettings } from '@/app/study/settings'
import { db } from '@/db'
import { loadKana, loadStrokes } from '@/packs/ja/loader'
import type { KanaItem, StrokeItem } from '@/packs/ja/types'

import styles from './Kana.module.css'

const CHECK_SIZE = 10

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

function optionsFor(item: KanaItem, pool: KanaItem[]): string[] {
  const others = pool.filter(
    (k) => k.romaji !== item.romaji && (k.row === item.row || k.vowel === item.vowel),
  )
  const distractors = [...others]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((k) => k.romaji)
  while (distractors.length < 3)
    distractors.push(pool[Math.floor(Math.random() * pool.length)]!.romaji)
  return shuffle([...new Set([item.romaji, ...distractors])])
}

const PASS_MARK = 9

/** Kana table and the kana check that unlocks kanji content. */
export function KanaRoute() {
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const [kana, setKana] = useState<KanaItem[]>([])
  const [strokes, setStrokes] = useState<Map<string, StrokeItem>>(new Map())
  const [script, setScript] = useState<'hiragana' | 'katakana'>('hiragana')
  const [focus, setFocus] = useState<KanaItem>()
  const [check, setCheck] = useState<{
    items: KanaItem[]
    index: number
    right: number
    options: string[]
    picked?: string
  } | null>(null)
  const cards = useLiveQuery(() => db.cards.where('group').equals('kana').toArray(), [])
  const met = useMemo(() => new Set((cards ?? []).map((c) => c.itemId)), [cards])

  useEffect(() => {
    void Promise.all([loadKana(), loadStrokes('kana')]).then(([k, s]) => {
      setKana(k)
      setStrokes(new Map(s.map((x) => [x.char, x])))
    })
  }, [])

  const ordered = useMemo(
    () => kanaLessonOrder(kana).filter((k) => k.script === script),
    [kana, script],
  )
  const basic = ordered.filter((k) => k.voicing === 'none')
  const voiced = ordered.filter((k) => k.voicing !== 'none')

  function startCheck() {
    const pool = kana.filter(
      (k) =>
        k.script === 'hiragana' &&
        !k.small &&
        k.voicing === 'none' &&
        !['wi', 'we', 'vu', 'wo'].includes(k.romaji),
    )
    const items = shuffle(pool).slice(0, CHECK_SIZE)
    setCheck({ items, index: 0, right: 0, options: optionsFor(items[0]!, pool) })
  }

  function pick(option: string) {
    if (!check || check.picked) return
    const item = check.items[check.index]!
    const right = check.right + (option === item.romaji ? 1 : 0)
    setCheck({ ...check, picked: option, right })
    window.setTimeout(() => {
      const index = check.index + 1
      if (index >= check.items.length) {
        setCheck({ items: check.items, index, right, options: [] as string[] })
        if (right >= PASS_MARK) void update({ kanaReady: true })
        return
      }
      const pool = kana.filter((k) => k.script === 'hiragana' && !k.small && k.voicing === 'none')
      setCheck({ items: check.items, index, right, options: optionsFor(check.items[index]!, pool) })
    }, 650)
  }

  if (check) {
    const finished = check.index >= check.items.length
    const item = check.items[check.index]
    return (
      <section className={styles.kana} aria-labelledby="check-title">
        <p className={styles.eyebrow}>Kana check</p>
        {finished ? (
          <>
            <h1 id="check-title">
              {check.right >= PASS_MARK
                ? 'You read kana.'
                : `${check.right} of ${CHECK_SIZE}. Not yet.`}
            </h1>
            <p className={styles.lede}>
              {check.right >= PASS_MARK
                ? 'Kanji and words are unlocked. Kana keep coming back in reviews until they are automatic.'
                : 'Keep meeting kana in your sessions and try again whenever you like.'}
            </p>
            <div className={styles.row}>
              <Link to="/" className={styles.primaryLink}>
                Back to today
              </Link>
              <Button variant="quiet" onClick={() => setCheck(null)}>
                Back to the table
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 id="check-title" className="visually-hidden">
              Which sound is this?
            </h1>
            <p className={styles.counter}>
              {check.index + 1} / {CHECK_SIZE}
            </p>
            <p
              className={`${styles.checkChar} ja-display`}
              lang="ja"
              aria-label={`kana ${item!.char}`}
            >
              {item!.char}
            </p>
            <div className={styles.options} role="group" aria-label="Which sound is this?">
              {check.options.map((o, i) => (
                <button
                  key={o}
                  type="button"
                  className={styles.option}
                  data-state={
                    check.picked
                      ? o === item!.romaji
                        ? 'right'
                        : o === check.picked
                          ? 'wrong'
                          : undefined
                      : undefined
                  }
                  onClick={() => pick(o)}
                  disabled={Boolean(check.picked)}
                >
                  <span>{o}</span>
                  <kbd className={styles.kbd}>{i + 1}</kbd>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    )
  }

  return (
    <section className={styles.kana} aria-labelledby="kana-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Kana</p>
          <h1 id="kana-title">
            {settings.kanaReady ? 'The two syllabaries.' : 'Start with the sounds.'}
          </h1>
        </div>
      </header>
      <p className={styles.lede}>
        {settings.kanaReady
          ? 'Tap any character to watch it written. Each one carries its romaji and its counterpart in the other script.'
          : `Sessions introduce hiragana five at a time, row by row. ${met.size} of ${kana.filter((k) => !k.small).length} met so far. Pass the check whenever you are ready and kanji unlock.`}
      </p>
      {!settings.kanaReady && (
        <div className={styles.row}>
          <Link to="/review" className={styles.primaryLink}>
            Learn kana <Icon name="chevron" size={18} />
          </Link>
          <Button onClick={startCheck}>Take the kana check</Button>
        </div>
      )}

      <div className={styles.tabs} role="tablist" aria-label="Script">
        {(['hiragana', 'katakana'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={script === s}
            className={styles.tab}
            onClick={() => setScript(s)}
          >
            {s === 'hiragana' ? 'Hiragana' : 'Katakana'}
          </button>
        ))}
      </div>

      {focus && (
        <div className={styles.focus} aria-live="polite">
          <div className={styles.focusGlyph}>
            {strokes.get(focus.char) ? (
              <StrokeGlyph item={strokes.get(focus.char)!} speed={360} replayKey={focus.char} />
            ) : (
              <span lang="ja">{focus.char}</span>
            )}
          </div>
          <div className={styles.focusText}>
            <p className={styles.focusRomaji}>{focus.romaji}</p>
            <p className={styles.focusMeta}>
              {focus.script} · {focus.voicing === 'none' ? 'plain' : focus.voicing} · counterpart{' '}
              <span lang="ja">{focus.pair ?? '—'}</span>
            </p>
            <Speak text={focus.char} label={`Hear ${focus.romaji}`} />
          </div>
        </div>
      )}

      <KanaTable title="Basic" items={basic} met={met} onPick={setFocus} />
      <KanaTable title="Voiced" items={voiced} met={met} onPick={setFocus} />
    </section>
  )
}

function KanaTable({
  title,
  items,
  met,
  onPick,
}: {
  title: string
  items: KanaItem[]
  met: Set<string>
  onPick: (k: KanaItem) => void
}) {
  if (items.length === 0) return null
  return (
    <section className={styles.block} aria-label={title}>
      <h2 className={styles.blockTitle}>{title}</h2>
      <ul className={styles.grid} role="list">
        {items.map((k) => (
          <li key={k.id}>
            <button
              type="button"
              className={styles.cell}
              data-met={met.has(k.id) ? 'true' : undefined}
              onClick={() => onPick(k)}
              aria-label={`${k.char}, ${k.romaji}`}
            >
              <span lang="ja" className={styles.cellChar}>
                {k.char}
              </span>
              <span className={styles.cellRomaji}>{k.romaji}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
