import { useEffect, useRef, useState } from 'react'

import { AssemblyStage } from '@/app/components/assembly/AssemblyStage'
import { Button } from '@/app/components/Button'
import { Furigana } from '@/app/components/Furigana'
import { Icon } from '@/app/components/Icon'
import { MemoryAid } from '@/app/components/MemoryAid'
import { Speak } from '@/app/components/Speak'
import { StrokeGlyph } from '@/app/components/StrokeGlyph'
import { Trace } from '@/app/components/Trace'
import { Link, useParams } from '@/app/router/index'
import { LEVELS, type Level } from '@/packs/ja/levels'
import { findKanjiUsing, loadKanji, loadSentences, loadVocab, strokesFor } from '@/packs/ja/loader'
import { displayForm, primaryGloss, readingsFor } from '@/packs/ja/cards'
import type { KanjiItem, SentenceItem, StrokeItem, VocabItem } from '@/packs/ja/types'

import styles from './KanjiDetail.module.css'

type Mode = 'strokes' | 'trace' | 'assemble'

const MODES: Array<{ id: Mode; label: string; icon: 'strokes' | 'parts' | 'spark' }> = [
  { id: 'strokes', label: 'Strokes', icon: 'strokes' },
  { id: 'trace', label: 'Trace', icon: 'spark' },
  { id: 'assemble', label: 'Assemble', icon: 'parts' },
]

interface Loaded {
  kanji: KanjiItem
  level: Level
  strokes?: StrokeItem
  words: VocabItem[]
  sentences: SentenceItem[]
}

async function findKanji(char: string): Promise<Loaded | undefined> {
  for (const level of LEVELS) {
    const list = await loadKanji(level)
    const kanji = list.find((k) => k.char === char)
    if (!kanji) continue
    const [strokes, vocabAll] = await Promise.all([
      strokesFor(char, level),
      Promise.all(LEVELS.map((l) => loadVocab(l))),
    ])
    const words = vocabAll
      .flat()
      .filter((v) => v.kanji.includes(char))
      .slice(0, 12)
    const wordIds = new Set(words.map((w) => w.id))
    const sentenceLevels = [...new Set(words.map((w) => w.level))]
    const sentences = (await Promise.all(sentenceLevels.map((l) => loadSentences(l))))
      .flat()
      .filter((s) => wordIds.has(s.word))
      .slice(0, 6)
    return { kanji, level, words, sentences, ...(strokes ? { strokes } : {}) }
  }
  return undefined
}

export function KanjiDetailRoute() {
  const { char = '' } = useParams()
  const [loaded, setLoaded] = useState<{ char: string; data: Loaded | null }>()
  const [replay, setReplay] = useState(0)
  const [numbers, setNumbers] = useState(false)
  const [highlight, setHighlight] = useState<number>()
  const [mode, setMode] = useState<Mode>('strokes')
  const stageRef = useRef<HTMLDivElement>(null)
  const [alsoIn, setAlsoIn] = useState<Array<{ kanji: KanjiItem; level: Level }>>([])

  useEffect(() => {
    let cancelled = false
    void findKanji(char).then((d) => !cancelled && setLoaded({ char, data: d ?? null }))
    return () => {
      cancelled = true
    }
  }, [char])

  useEffect(() => {
    // The tracing surface needs the whole square on screen, clear of the tab bar.
    if (mode === 'strokes') return
    const id = window.setTimeout(() => {
      stageRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 50)
    return () => window.clearTimeout(id)
  }, [mode])

  const data = loaded?.char === char ? loaded.data : undefined
  const selectedPart =
    highlight === undefined ? undefined : data?.strokes?.groups[highlight]?.element

  useEffect(() => {
    if (!selectedPart) return
    let cancelled = false
    void findKanjiUsing(selectedPart, { exclude: char, limit: 10 }).then((list) => {
      if (!cancelled) setAlsoIn(list)
    })
    return () => {
      cancelled = true
    }
  }, [selectedPart, char])
  if (data === undefined) {
    return (
      <p className={styles.muted} role="status">
        Looking it up…
      </p>
    )
  }
  if (data === null) {
    return (
      <section className={styles.detail}>
        <h1>Not in the library</h1>
        <p className={styles.muted}>
          <span lang="ja">{char}</span> isn't on any of the level lists this app uses.
        </p>
        <Link to="/library">Back to the library</Link>
      </section>
    )
  }

  const { kanji, strokes, words, sentences } = data
  const groups = strokes?.groups ?? []

  return (
    <article className={styles.detail} aria-labelledby="kanji-title">
      <header className={styles.header}>
        <Link to="/library" className={styles.back} aria-label="Back to the library">
          <Icon name="chevron" className={styles.backIcon} />
        </Link>
        <p className={styles.eyebrow}>
          {data.level} · {kanji.strokes} strokes · grade {kanji.grade ?? '—'}
        </p>
      </header>

      <div className={styles.heroRow}>
        <div
          className={styles.heroGlyph}
          onClick={() => setReplay((n) => n + 1)}
          role="presentation"
        >
          {strokes ? (
            <StrokeGlyph
              item={strokes}
              speed={300}
              numbers={numbers}
              replayKey={replay}
              {...(highlight === undefined ? {} : { highlightGroup: highlight })}
              label={`${kanji.char}, drawn stroke by stroke`}
            />
          ) : (
            <p className={`${styles.heroText} ja-display`} lang="ja">
              {kanji.char}
            </p>
          )}
        </div>
        <div className={styles.heroText2}>
          <h1 id="kanji-title" className={styles.title}>
            <span lang="ja" className={styles.titleChar}>
              {kanji.char}
            </span>
            <span className={styles.titleMeaning}>{kanji.meanings.slice(0, 3).join(' · ')}</span>
          </h1>
          <dl className={styles.readings}>
            {kanji.on.length > 0 && (
              <div>
                <dt>On</dt>
                <dd lang="ja">{kanji.on.join('、')}</dd>
              </div>
            )}
            {kanji.kun.length > 0 && (
              <div>
                <dt>Kun</dt>
                <dd lang="ja">{kanji.kun.join('、')}</dd>
              </div>
            )}
          </dl>
          <div className={styles.heroTools}>
            {strokes && (
              <>
                <Button onClick={() => setReplay((n) => n + 1)}>
                  <Icon name="strokes" size={18} /> Replay
                </Button>
                <Button
                  variant="quiet"
                  aria-pressed={numbers}
                  onClick={() => setNumbers((v) => !v)}
                >
                  Numbers
                </Button>
              </>
            )}
            <Speak
              text={kanji.kun[0]?.replace(/[.-]/g, '') ?? kanji.on[0] ?? kanji.char}
              label={`Hear ${kanji.char}`}
            />
          </div>
        </div>
      </div>

      {strokes && (
        <section className={styles.study} aria-label="Ways to study this kanji">
          <div className={styles.modes} role="radiogroup" aria-label="Study mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                className={styles.mode}
                onClick={() => setMode(m.id)}
              >
                <Icon name={m.icon} size={16} />
                {m.label}
              </button>
            ))}
          </div>
          {mode === 'trace' && (
            <div className={styles.stage} ref={stageRef}>
              <Trace item={strokes} />
            </div>
          )}
          {mode === 'assemble' && (
            <div className={styles.stage} ref={stageRef}>
              <AssemblyStage item={strokes} highlighted={highlight} onSelect={setHighlight} />
            </div>
          )}
          {mode === 'strokes' && (
            <p className={styles.muted}>
              Tap the kanji to watch it write itself. Trace it with a finger, or take it apart into
              its components.
            </p>
          )}
        </section>
      )}

      {(groups.length > 0 || kanji.components.length > 0) && (
        <section className={styles.block} aria-labelledby="parts-title">
          <h2 id="parts-title" className={styles.blockTitle}>
            <Icon name="parts" size={18} /> Parts
          </h2>
          <p className={styles.muted}>
            Tap a part to light its strokes. Parts come from KanjiVG and KRADFILE.
          </p>
          <div className={styles.chips}>
            {groups.map((g, i) =>
              g.element ? (
                <button
                  key={i}
                  type="button"
                  className={styles.chip}
                  aria-pressed={highlight === i}
                  onClick={() => setHighlight(highlight === i ? undefined : i)}
                >
                  <span lang="ja" className={styles.chipGlyph}>
                    {g.element}
                  </span>
                  {g.position && <span className={styles.chipMeta}>{g.position}</span>}
                </button>
              ) : null,
            )}
            {kanji.components
              .filter((c) => !groups.some((g) => g.element === c))
              .map((c) => (
                <span key={c} className={`${styles.chip} ${styles.chipStatic}`} lang="ja">
                  {c}
                </span>
              ))}
          </div>
          {selectedPart && alsoIn.length > 0 && (
            <div className={styles.alsoIn}>
              <p className={styles.alsoInTitle}>
                <span lang="ja">{selectedPart}</span> also appears in
              </p>
              <ul className={styles.alsoInList} role="list">
                {alsoIn.map(({ kanji: k, level }) => (
                  <li key={k.char}>
                    <Link
                      to={`/kanji/${encodeURIComponent(k.char)}`}
                      className={styles.alsoInItem}
                      aria-label={`${k.char}, ${k.meanings[0] ?? ''}, ${level}`}
                    >
                      <span lang="ja" className={styles.alsoInChar}>
                        {k.char}
                      </span>
                      <span className={styles.alsoInMeaning}>{k.meanings[0]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className={styles.block} aria-labelledby="aid-title">
        <h2 id="aid-title" className={styles.blockTitle}>
          <Icon name="spark" size={18} /> Remember it
        </h2>
        <MemoryAid itemId={kanji.id} char={kanji.char} />
      </section>

      {words.length > 0 && (
        <section className={styles.block} aria-labelledby="words-title">
          <h2 id="words-title" className={styles.blockTitle}>
            <Icon name="library" size={18} /> Words that use it
          </h2>
          <ul className={styles.words} role="list">
            {words.map((w) => {
              const form = displayForm(w)
              return (
                <li key={w.id} className={styles.wordRow}>
                  <span className={styles.wordForm}>
                    <Furigana text={form} reading={readingsFor(w, form)[0]} show="always" />
                  </span>
                  <span className={styles.wordGloss}>{primaryGloss(w)}</span>
                  <span className={styles.wordLevel}>{w.level}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {sentences.length > 0 && (
        <section className={styles.block} aria-labelledby="sentences-title">
          <h2 id="sentences-title" className={styles.blockTitle}>
            <Icon name="sentence" size={18} /> In sentences
          </h2>
          <ul className={styles.sentences} role="list">
            {sentences.map((s) => (
              <li key={s.id} className={styles.sentence}>
                <p lang="ja" className={styles.sentenceJa}>
                  {s.jp}
                  {s.audio && (
                    <Speak
                      text={s.jp}
                      clip={s.audio.file}
                      label="Hear this sentence"
                      size={16}
                      className={styles.sentenceSpeak}
                    />
                  )}
                </p>
                <p className={styles.sentenceEn}>{s.en}</p>
                <p className={styles.credit}>
                  <a
                    href={`https://tatoeba.org/sentences/show/${s.tatoebaId}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Tatoeba
                  </a>{' '}
                  · {s.contributor}
                  {s.audio ? ` · audio ${s.audio.speaker} (${s.audio.licence})` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
