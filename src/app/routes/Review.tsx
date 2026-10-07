import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { Button } from '@/app/components/Button'
import { Choices, type Choice } from '@/app/components/Choices'
import { Crack } from '@/app/components/Crack'
import { Furigana } from '@/app/components/Furigana'
import { GoldFlecks } from '@/app/components/GoldFlecks'
import { Listen } from '@/app/components/Listen'
import { hearJapanese, recognitionSupported } from '@/app/audio/listen'
import { speak } from '@/app/audio/voice'
import { useSettings } from '@/app/study/settings'
import { Trace } from '@/app/components/Trace'
import { useSync } from '@/app/sync/store'
import { Icon } from '@/app/components/Icon'
import { Sheet } from '@/app/components/Sheet'
import { Speak } from '@/app/components/Speak'
import { StrokeGlyph } from '@/app/components/StrokeGlyph'
import { Tile } from '@/app/components/Tile'
import { Vessel } from '@/app/components/Vessel'
import { cue, fx } from '@/app/motion/bus'
import { comboBeat } from '@/app/motion/ease'
import { Link, useNavigate } from '@/app/router/index'
import { useStudySession } from '@/app/study/useStudySession'
import { GRADE_LABELS } from '@/engine/session'
import type { TracingState } from '@/engine/tracing'
import type { Grade, StudyCard } from '@/engine/types'
import { displayForm, JA_CARD_TYPES, primaryGloss, readingsFor } from '@/packs/ja/cards'
import { checkReading, checkSpoken } from '@/packs/ja/grading'
import { sentencesFor, strokesFor } from '@/packs/ja/loader'
import type { Level } from '@/packs/ja/levels'
import type { KanaItem, KanjiItem, SentenceItem, StrokeItem, VocabItem } from '@/packs/ja/types'

import styles from './Review.module.css'

const GRADE_ICON: Record<Grade, 'crack' | 'chevron' | 'check' | 'spark'> = {
  1: 'crack',
  2: 'chevron',
  3: 'check',
  4: 'spark',
}

const Mended = lazy(() => import('@/app/motion/Mended'))

/** Lapses after which a card counts as a leech (Anki's long-standing default). */
const LEECH_LAPSES = 8

export function ReviewRoute() {
  const session = useStudySession()
  const navigate = useNavigate()
  const [cracking, setCracking] = useState(false)
  const [leech, setLeech] = useState<{ key: string; itemId: string; lapses: number }>()
  const leechShown = useRef(new Set<string>())
  const synced = useRef(false)

  // After each session, hand the snapshot to sync if it is switched on (rate-limited there).
  useEffect(() => {
    if (!session.complete || synced.current) return
    synced.current = true
    void useSync
      .getState()
      .load()
      .then(() => useSync.getState().sync('session'))
  }, [session.complete])

  // A card that keeps cracking is a leech: offer to set it aside or write a memory aid.
  const last = session.lastGraded
  useEffect(() => {
    if (!last || last.lapses < LEECH_LAPSES || last.suspended) return
    if (leechShown.current.has(last.key)) return
    leechShown.current.add(last.key)
    setLeech({ key: last.key, itemId: last.itemId, lapses: last.lapses })
  }, [last])

  /** Again cracks the tile for a beat before the card moves on. */
  const crackTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(crackTimer.current), [])

  /** Consecutive recalled cards this session; a miss resets it. */
  const streak = useRef(0)

  /** Sound and a flourish for the grade, on the frame the learner commits to it. */
  function celebrate(g: Grade) {
    const x = window.innerWidth / 2
    const y = window.innerHeight * 0.42
    if (g === 1) {
      streak.current = 0
      cue('crack')
      return
    }
    if (g === 2) {
      cue('tap')
      return
    }
    streak.current += 1
    cue('seal', streak.current)
    fx({ kind: 'seal', x, y })
    if ((session.card?.lapses ?? 0) > 0) {
      fx({ kind: 'gold', x, y: y + 90 })
      cue('gold', streak.current)
    }
    const beat = comboBeat(streak.current)
    if (beat) {
      fx({ kind: 'combo', beat })
      if (beat >= 5) cue('taiko')
    }
  }

  function gradeWithCrack(g: Grade) {
    celebrate(g)
    if (g === 1 && !cracking) {
      setCracking(true)
      const key = session.card?.key
      crackTimer.current = window.setTimeout(() => {
        setCracking(false)
        // Only if the same card is still in front of the learner (undo may have moved on).
        if (session.card?.key === key) void session.grade(1)
      }, 460)
      return
    }
    void session.grade(g)
  }

  function undoNow() {
    window.clearTimeout(crackTimer.current)
    setCracking(false)
    void session.undo()
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      // A dialog (the details sheet) owns the keyboard while it is open.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      if (event.key === ' ' && !session.revealed) {
        event.preventDefault()
        session.reveal()
      } else if (session.revealed && ['1', '2', '3', '4'].includes(event.key)) {
        gradeWithCrack(Number(event.key) as Grade)
      } else if (session.revealed && event.key === 'Enter' && session.suggestedGrade) {
        event.preventDefault()
        gradeWithCrack(session.suggestedGrade)
      } else if (event.key.toLowerCase() === 'u' && session.canUndo) {
        undoNow()
      } else if (event.key === 'Escape') {
        navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, session])

  if (session.status === 'loading') {
    return (
      <div className={styles.center} role="status" aria-live="polite">
        <p className={styles.muted}>Loading your cards…</p>
      </div>
    )
  }
  if (session.status === 'error') {
    return (
      <div className={styles.center} role="alert">
        <h1>The lesson didn't load</h1>
        <p className={styles.muted}>{session.error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    )
  }
  if (session.status === 'empty' || session.complete) {
    return (
      <div className={styles.center}>
        {session.complete && <GoldFlecks />}
        {session.complete ? (
          <Suspense fallback={null}>
            <Mended label={`Today's bowl, mended with gold seams after ${session.done} cards`} />
          </Suspense>
        ) : (
          <Vessel fill={1} seams={0} size={160} label="Today's bowl, full" />
        )}
        <p className={styles.eyebrow}>{session.complete ? 'Session complete' : 'All clear'}</p>
        <h1>{session.complete ? `${session.done} cards done.` : 'Nothing is due right now.'}</h1>
        <p className={styles.muted}>
          {session.complete
            ? 'Your next reviews are scheduled. See you tomorrow.'
            : 'Nothing is due. Your next reviews are scheduled.'}
        </p>
        <Button variant="primary" size="large" onClick={() => navigate('/')}>
          Back to today
        </Button>
      </div>
    )
  }

  const card = session.card
  const library = session.library
  if (!card || !library) return null
  const item = card.itemId.startsWith('k:')
    ? library.kanji.get(card.itemId)
    : card.itemId.startsWith('kana:')
      ? library.kana.get(card.itemId)
      : library.vocab.get(card.itemId)
  const fill = session.total === 0 ? 0 : session.done / session.total

  return (
    <div className={styles.review}>
      <header className={styles.top}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="End session"
          onClick={() => navigate('/')}
        >
          <Icon name="close" />
        </button>
        <div
          className={styles.progress}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={session.total}
          aria-valuenow={session.done}
          aria-label="Session progress"
        >
          <Vessel fill={fill} seams={Math.min(6, Math.floor(session.done / 4))} size={40} />
          <span className={styles.progressText}>
            {session.done} <span className={styles.muted}>/ {session.total}</span>
          </span>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Undo last grade"
          disabled={!session.canUndo}
          onClick={undoNow}
        >
          <Icon name="undo" />
        </button>
      </header>
      {leech && (
        <div className={styles.leech} role="status" aria-live="polite">
          <p className={styles.leechText}>
            This one has cracked {leech.lapses} times. A memory aid helps more than another repeat.
          </p>
          <div className={styles.leechButtons}>
            {leech.itemId.startsWith('k:') && (
              <Link
                to={`/kanji/${encodeURIComponent(leech.itemId.slice(2))}`}
                className={styles.leechLink}
              >
                Write a memory aid
              </Link>
            )}
            <Button
              variant="quiet"
              onClick={() => {
                void session.suspend(leech.key)
                setLeech(undefined)
              }}
            >
              Set it aside
            </Button>
            <Button variant="quiet" onClick={() => setLeech(undefined)}>
              Keep going
            </Button>
          </div>
        </div>
      )}

      {item && card.cardType === JA_CARD_TYPES.kanjiWriting ? (
        <WritingFace
          key={card.key}
          card={card}
          kanji={item as KanjiItem}
          session={session}
          cracking={cracking}
          onGrade={gradeWithCrack}
        />
      ) : item &&
        (card.cardType === JA_CARD_TYPES.kanaRecognition ||
          card.cardType === JA_CARD_TYPES.kanjiContrast ||
          card.cardType === JA_CARD_TYPES.vocabCloze ||
          card.cardType === JA_CARD_TYPES.vocabListening) ? (
        <ChoiceFace
          key={card.key}
          card={card}
          item={item}
          session={session}
          cracking={cracking}
          onGrade={gradeWithCrack}
        />
      ) : item ? (
        <CardFace
          key={card.key}
          card={card}
          item={item as KanjiItem | VocabItem}
          session={session}
          cracking={cracking}
          onGrade={gradeWithCrack}
        />
      ) : (
        <div className={styles.center} role="alert">
          <p>This card's word is missing from the word list. Skipping it.</p>
          <Button onClick={session.skip}>Skip</Button>
        </div>
      )}
    </div>
  )
}

type Session = ReturnType<typeof useStudySession>

function CardFace({
  card,
  item,
  session,
  cracking,
  onGrade,
}: {
  card: StudyCard
  item: KanjiItem | VocabItem
  session: Session
  cracking: boolean
  onGrade: (g: Grade) => void
}) {
  const isKanji = card.cardType === JA_CARD_TYPES.kanjiMeaning
  const isReading = card.cardType === JA_CARD_TYPES.vocabReading
  const level = card.group as Level
  const [strokes, setStrokes] = useState<StrokeItem>()
  const [sentences, setSentences] = useState<SentenceItem[]>([])
  const [sheet, setSheet] = useState(false)
  // Repair progress: how far the gold has retraced the crack since the last lapse.
  const repaired =
    card.lapses > 0 ? Math.min(1, Math.max(0, (card.reps - card.lapses) / (card.lapses + 2))) : 0

  useEffect(() => {
    let cancelled = false
    if (isKanji)
      void strokesFor((item as KanjiItem).char, level).then((s) => !cancelled && setStrokes(s))
    else void sentencesFor(item.id, level).then((s) => !cancelled && setSentences(s))
    return () => {
      cancelled = true
    }
  }, [isKanji, item, level])

  const word = !isKanji ? (item as VocabItem) : undefined
  const form = word ? displayForm(word) : ''
  const reading = word ? readingsFor(word, form)[0] : undefined
  const sentence = sentences[0]
  const autoAudio = useSettings((s) => s.settings.autoAudio)

  // Hear the word the moment its answer shows: sound, spelling and meaning arrive together.
  useEffect(() => {
    if (session.revealed && autoAudio && reading) void speak(reading)
  }, [session.revealed, autoAudio, reading])

  return (
    <>
      <Tile
        cardKey={card.key}
        swipeEnabled={session.revealed && !cracking}
        seamProgress={repaired}
        onSwipe={(d) => onGrade(d === 'good' ? 3 : 1)}
      >
        {(card.lapses > 0 || cracking) && (
          <Crack
            seed={card.key}
            gold={cracking ? 0 : session.revealed ? repaired : repaired * 0.6}
            drawing={cracking}
          />
        )}
        <div className={styles.prompt}>
          <p className={styles.kind}>
            {isKanji ? 'Kanji · meaning' : isReading ? 'Word · reading' : 'Word · meaning'}
          </p>
          {isKanji ? (
            <div className={styles.heroGlyph}>
              {session.revealed && strokes ? (
                <StrokeGlyph
                  item={strokes}
                  speed={300}
                  className={styles.glyphGold}
                  label={`${(item as KanjiItem).char}, drawn stroke by stroke`}
                />
              ) : (
                <p className={`${styles.hero} ja-display`} lang="ja">
                  {(item as KanjiItem).char}
                </p>
              )}
            </div>
          ) : (
            <p className={`${styles.hero} ja-display`} lang="ja">
              {session.revealed && !isReading && reading ? (
                <Furigana text={form} reading={reading} show="always" />
              ) : (
                form
              )}
            </p>
          )}
        </div>
        <div className={styles.answer} aria-live="polite">
          {session.revealed ? (
            isKanji ? (
              <KanjiAnswer kanji={item as KanjiItem} />
            ) : (
              <WordAnswer
                word={word!}
                form={form}
                reading={reading}
                sentence={sentence}
                showReading={isReading}
                onMore={() => setSheet(true)}
              />
            )
          ) : isReading ? (
            <ReadingInput item={word!} session={session} />
          ) : null}
        </div>
        <div className={styles.hint}>
          {session.verdict === 'right' ? (
            <span className={styles.right}>Right. Enter or Good continues.</span>
          ) : session.verdict === 'wrong' ? (
            <span className={styles.wrong}>Not quite. It comes back soon.</span>
          ) : session.revealed ? (
            <span>Swipe right for Good, left for Again.</span>
          ) : !isReading ? (
            <span>Answer in your head, then reveal it.</span>
          ) : null}
        </div>
      </Tile>

      <div className={styles.controls}>
        {!session.revealed && !isReading && (
          <Button variant="primary" size="large" onClick={session.reveal} autoFocus>
            Reveal
          </Button>
        )}
        {session.revealed && (
          <div className={styles.grades} role="group" aria-label="Grade this card">
            {([1, 2, 3, 4] as Grade[]).map((g) => (
              <Button
                key={g}
                variant={g === 1 ? 'danger' : g === 3 ? 'success' : 'secondary'}
                size="large"
                aria-pressed={session.suggestedGrade === g ? true : undefined}
                autoFocus={session.suggestedGrade === g}
                disabled={cracking}
                onClick={() => onGrade(g)}
              >
                <Icon name={GRADE_ICON[g]} size={18} />
                {GRADE_LABELS[g]}
                <kbd className={styles.kbd}>{g}</kbd>
              </Button>
            ))}
          </div>
        )}
      </div>

      {word && (
        <Sheet open={sheet} onClose={() => setSheet(false)} title={form} titleLang="ja">
          <p className={styles.sheetReading} lang="ja">
            {word ? readingsFor(word, form).join('、') : ''}
          </p>
          <p className={styles.sheetGloss}>
            {word ? word.senses.map((s) => s.gloss.join('; ')).join(' · ') : ''}
          </p>
          <h3 className={styles.sheetHeading}>In sentences</h3>
          {sentences.length === 0 && (
            <p className={styles.muted}>No example sentences for this word yet.</p>
          )}
          <ul className={styles.sentenceList}>
            {sentences.map((s) => (
              <li key={s.id}>
                <SentenceLine sentence={s} />
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  )
}

function KanjiAnswer({ kanji }: { kanji: KanjiItem }) {
  return (
    <div className={styles.answerBody}>
      <p className={styles.meaning}>{kanji.meanings.slice(0, 4).join(' · ')}</p>
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
            <dd lang="ja">{kanji.kun.slice(0, 4).join('、')}</dd>
          </div>
        )}
      </dl>
      {kanji.components.length > 1 && (
        <p className={styles.parts}>
          <Icon name="parts" size={16} />
          <span lang="ja">{kanji.components.join('　')}</span>
        </p>
      )}
    </div>
  )
}

function WordAnswer({
  word,
  form,
  reading,
  sentence,
  showReading,
  onMore,
}: {
  word: VocabItem
  form: string
  reading?: string | undefined
  sentence?: SentenceItem | undefined
  showReading: boolean
  onMore: () => void
}) {
  return (
    <div className={styles.answerBody}>
      {showReading && reading && (
        <p className={styles.reading} lang="ja">
          {readingsFor(word, form).join('、')}
        </p>
      )}
      <p className={styles.meaning}>{primaryGloss(word)}</p>
      {sentence ? <SentenceLine sentence={sentence} compact /> : null}
      <div className={styles.answerTools}>
        <Speak text={reading ?? form} label={`Hear ${form}`} />
        <button type="button" className={styles.more} onClick={onMore}>
          <Icon name="sentence" size={16} />
          More
        </button>
      </div>
    </div>
  )
}

function SentenceLine({
  sentence,
  compact = false,
}: {
  sentence: SentenceItem
  compact?: boolean
}) {
  const parts =
    sentence.form && sentence.jp.includes(sentence.form)
      ? sentence.jp.split(sentence.form)
      : [sentence.jp]
  return (
    <div className={compact ? styles.sentenceCompact : styles.sentence}>
      <p lang="ja" className={styles.sentenceJa}>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && <mark className={styles.mark}>{sentence.form}</mark>}
          </span>
        ))}
        {sentence.audio && (
          <Speak
            text={sentence.jp}
            clip={sentence.audio.file}
            label="Hear this sentence"
            size={16}
            className={styles.sentenceSpeak}
          />
        )}
      </p>
      <p className={styles.sentenceEn}>{sentence.en}</p>
      {!compact && (
        <p className={styles.credit}>
          <a
            href={`https://tatoeba.org/sentences/show/${sentence.tatoebaId}`}
            target="_blank"
            rel="noreferrer"
          >
            Tatoeba
          </a>{' '}
          · {sentence.contributor}
          {sentence.audio ? ` · audio ${sentence.audio.speaker} (${sentence.audio.licence})` : ''}
        </p>
      )}
    </div>
  )
}

function ReadingInput({ item, session }: { item: VocabItem; session: Session }) {
  const [value, setValue] = useState('')
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)
  const accepted = readingsFor(item, displayForm(item))
  const [canSpeak] = useState(recognitionSupported)

  async function sayIt() {
    setListening(true)
    setHeard(undefined)
    const { result } = hearJapanese()
    const r = await result
    setListening(false)
    if (!r.ok) {
      setHeard(
        r.error === 'not-allowed' || r.error === 'service-not-allowed'
          ? 'Microphone access is off for this site.'
          : 'Nothing heard. Try again, or type it.',
      )
      return
    }
    setHeard(`Heard: ${r.alternatives[0] ?? ''}`)
    const check = checkSpoken(
      r.alternatives,
      accepted,
      item.forms.map((f) => f.text),
    )
    session.answer(check.correct ? 'right' : 'wrong')
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function submit(event: FormEvent) {
    event.preventDefault()
    const result = checkReading(value, accepted)
    session.answer(result.correct ? 'right' : 'wrong')
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className="visually-hidden" htmlFor="reading-input">
        Type the reading in kana or romaji
      </label>
      <input
        id="reading-input"
        ref={inputRef}
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type the reading"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        lang="ja"
        inputMode="text"
      />
      <Button variant="primary" type="submit">
        Check
      </Button>
      {canSpeak && (
        <Button
          variant="quiet"
          onClick={() => void sayIt()}
          disabled={listening}
          aria-pressed={listening}
          className={styles.sayIt}
        >
          <Icon name="speaker" size={18} />
          {listening ? 'Listening…' : 'Say it'}
        </Button>
      )}
      {heard && (
        <p className={styles.heard} role="status" lang="ja">
          {heard}
        </p>
      )}
      {canSpeak && !heard && !listening && (
        <p className={styles.heard}>
          Speech is recognised by your browser's service (Apple in Safari, Google in Chrome).
        </p>
      )}
    </form>
  )
}

/** Multiple-choice cards: kana → romaji, look-alike kanji by meaning, and sentence cloze. */
function ChoiceFace({
  card,
  item,
  session,
  cracking,
  onGrade,
}: {
  card: StudyCard
  item: KanaItem | KanjiItem | VocabItem
  session: Session
  cracking: boolean
  onGrade: (g: Grade) => void
}) {
  const library = session.library!
  const [picked, setPicked] = useState<string>()
  const repaired =
    card.lapses > 0 ? Math.min(1, Math.max(0, (card.reps - card.lapses) / (card.lapses + 2))) : 0

  const built = useMemo(() => buildChoices(card, item, library), [card, item, library])

  const autoAudio = useSettings((s) => s.settings.autoAudio)

  function pick(id: string) {
    if (picked) return
    setPicked(id)
    if (autoAudio && card.cardType === JA_CARD_TYPES.kanaRecognition)
      void speak((item as KanaItem).char)
    if (autoAudio && card.cardType === JA_CARD_TYPES.vocabCloze) {
      const w = item as VocabItem
      void speak(readingsFor(w, displayForm(w))[0] ?? displayForm(w))
    }
    const right = id === built.correctId
    session.answer(right ? 'right' : 'wrong')
    window.setTimeout(() => onGrade(right ? 3 : 1), right ? 700 : 1500)
  }

  return (
    <Tile cardKey={card.key} swipeEnabled={false} seamProgress={repaired} onSwipe={() => undefined}>
      {(card.lapses > 0 || cracking) && (
        <Crack seed={card.key} gold={cracking ? 0 : repaired} drawing={cracking} />
      )}
      <div className={styles.prompt}>
        <p className={styles.kind}>{built.kind}</p>
        {built.listen ? (
          <>
            <Listen text={built.listen} />
            {picked && built.promptJa && (
              <p className={`${styles.sub} ja-display`} lang="ja">
                {built.promptJa}
              </p>
            )}
          </>
        ) : built.promptJa ? (
          <p
            className={`${styles.hero} ja-display`}
            lang="ja"
            style={
              built.small
                ? {
                    fontSize: 'calc(var(--fs-h1) * var(--ja-scale, 1))',
                    lineHeight: 1.5,
                    textAlign: 'center',
                    padding: '0 var(--sp-3)',
                  }
                : undefined
            }
          >
            {built.promptJa}
          </p>
        ) : (
          <p className={styles.meaning}>{built.promptEn}</p>
        )}
        {built.promptJa && built.promptEn && <p className={styles.sub}>{built.promptEn}</p>}
      </div>
      <div className={styles.answer}>
        <Choices
          choices={built.choices}
          correctId={built.correctId}
          picked={picked}
          onPick={pick}
          label={built.kind}
        />
      </div>
      <div className={styles.hint}>
        {session.verdict === 'right' ? (
          <span className={styles.right}>Right.</span>
        ) : session.verdict === 'wrong' ? (
          <span className={styles.wrong}>Not quite. {built.explain}</span>
        ) : (
          <span>Pick one. Keys 1–4 work too.</span>
        )}
      </div>
    </Tile>
  )
}

/** Write from memory: meaning and readings shown, the learner traces the kanji with no guide. */
function WritingFace({
  card,
  kanji,
  session,
  cracking,
  onGrade,
}: {
  card: StudyCard
  kanji: KanjiItem
  session: Session
  cracking: boolean
  onGrade: (g: Grade) => void
}) {
  const level = card.group as Level
  const [strokes, setStrokes] = useState<StrokeItem>()
  const [result, setResult] = useState<string>()
  const repaired =
    card.lapses > 0 ? Math.min(1, Math.max(0, (card.reps - card.lapses) / (card.lapses + 2))) : 0

  useEffect(() => {
    let cancelled = false
    void strokesFor(kanji.char, level).then((s) => !cancelled && setStrokes(s))
    return () => {
      cancelled = true
    }
  }, [kanji, level])

  function complete(state: TracingState) {
    const count = strokes?.strokes.length ?? 1
    const grade: Grade =
      state.skipped.length > 0 ? 1 : state.attempts > count + Math.ceil(count / 3) ? 2 : 3
    setResult(
      grade === 1
        ? `Some strokes needed help. ${kanji.char} comes back soon.`
        : grade === 2
          ? `Written, with ${state.attempts - count} retries.`
          : 'Written from memory.',
    )
    session.answer(grade === 1 ? 'wrong' : 'right')
    window.setTimeout(() => onGrade(grade), grade === 1 ? 1600 : 1100)
  }

  const showAnswer = session.revealed && !result

  return (
    <>
      <Tile
        cardKey={card.key}
        swipeEnabled={false}
        seamProgress={repaired}
        onSwipe={() => undefined}
      >
        {(card.lapses > 0 || cracking) && (
          <Crack seed={card.key} gold={cracking ? 0 : repaired} drawing={cracking} />
        )}
        <div className={styles.prompt}>
          <p className={styles.kind}>Writing · from memory</p>
          <p className={styles.meaning}>{kanji.meanings.slice(0, 3).join(' · ')}</p>
          <p className={styles.sub} lang="ja">
            {[...kanji.on.slice(0, 2), ...kanji.kun.slice(0, 2)].join('　')}
          </p>
        </div>
        <div className={styles.answer}>
          {!strokes ? null : showAnswer ? (
            <div className={styles.heroGlyph}>
              <StrokeGlyph
                item={strokes}
                speed={260}
                numbers
                className={styles.glyphGold}
                label={`${kanji.char}, drawn stroke by stroke`}
              />
            </div>
          ) : (
            <Trace item={strokes} memoryOnly onComplete={complete} />
          )}
        </div>
        <div className={styles.hint}>
          {result ? (
            <span className={session.verdict === 'right' ? styles.right : styles.wrong}>
              {result}
            </span>
          ) : showAnswer ? (
            <span>Compare it with yours, then grade how well you knew it.</span>
          ) : (
            <span>{kanji.strokes} strokes. Write it in order; Space shows the answer.</span>
          )}
        </div>
      </Tile>
      {showAnswer && (
        <div className={styles.controls}>
          <div className={styles.grades} role="group" aria-label="Grade this card">
            {([1, 2, 3, 4] as Grade[]).map((g) => (
              <Button
                key={g}
                variant={g === 1 ? 'danger' : g === 3 ? 'success' : 'secondary'}
                size="large"
                disabled={cracking}
                onClick={() => onGrade(g)}
              >
                <Icon name={GRADE_ICON[g]} size={18} />
                {GRADE_LABELS[g]}
                <kbd className={styles.kbd}>{g}</kbd>
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

interface Built {
  kind: string
  /** Listening cards: the text the device speaks; the written form appears after answering. */
  listen?: string | undefined
  promptJa?: string | undefined
  promptEn?: string | undefined
  small?: boolean | undefined
  choices: Choice[]
  correctId: string
  explain: string
}

function seededPick<T>(items: T[], n: number, seed: string): T[] {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619)
  const copy = [...items]
  const out: T[] = []
  while (out.length < n && copy.length > 0) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    out.push(copy.splice(h % copy.length, 1)[0]!)
  }
  return out
}

function buildChoices(
  card: StudyCard,
  item: KanaItem | KanjiItem | VocabItem,
  library: NonNullable<Session['library']>,
): Built {
  const seed = `${card.key}|${card.reps}`
  if (card.cardType === JA_CARD_TYPES.kanaRecognition) {
    const kana = item as KanaItem
    const pool = [...library.kana.values()].filter(
      (k) => k.script === kana.script && !k.small && k.romaji !== kana.romaji,
    )
    const near = pool.filter((k) => k.row === kana.row || k.vowel === kana.vowel)
    const distractors = seededPick(near.length >= 3 ? near : pool, 3, seed)
    const choices = seededPick([kana, ...distractors], 4, seed + 'o').map<Choice>((k) => ({
      id: k.id,
      label: k.romaji,
    }))
    return {
      kind: 'Kana · sound',
      promptJa: kana.char,
      choices,
      correctId: kana.id,
      explain: `${kana.char} is ${kana.romaji}.`,
    }
  }
  if (card.cardType === JA_CARD_TYPES.kanjiContrast) {
    const kanji = item as KanjiItem
    const pairs = library.confusables.get(kanji.id) ?? []
    const pair = seededPick(pairs, 1, seed)[0]
    const otherChar = pair ? (pair.a === kanji.char ? pair.b : pair.a) : undefined
    const other = otherChar
      ? [...library.kanji.values()].find((k) => k.char === otherChar)
      : undefined
    const choices = seededPick([kanji, ...(other ? [other] : [])], 2, seed + 'o').map<Choice>(
      (k) => ({ id: k.id, label: k.char, lang: 'ja' }),
    )
    return {
      kind: 'Look-alikes · which one',
      promptEn: kanji.meanings.slice(0, 2).join(' · '),
      choices,
      correctId: kanji.id,
      explain: `${kanji.char} is ${kanji.meanings[0]}${other ? `; ${other.char} is ${other.meanings[0]}` : ''}.`,
    }
  }
  const word = item as VocabItem
  const form = displayForm(word)
  if (card.cardType === JA_CARD_TYPES.vocabListening) {
    const sameKind = [...library.vocab.values()].filter(
      (v) =>
        v.id !== word.id &&
        primaryGloss(v) !== primaryGloss(word) &&
        v.senses[0]!.pos.some((p) => word.senses[0]!.pos.includes(p)),
    )
    const others = seededPick(
      sameKind.length >= 3 ? sameKind : [...library.vocab.values()].filter((v) => v.id !== word.id),
      3,
      seed,
    )
    const reading = readingsFor(word, form)[0] ?? form
    return {
      kind: 'Listening · meaning',
      listen: reading,
      promptJa: form === reading ? form : `${form}（${reading}）`,
      choices: seededPick([word, ...others], 4, seed + 'o').map<Choice>((v) => ({
        id: v.id,
        label: v.senses[0]!.gloss.slice(0, 2).join('; '),
      })),
      correctId: word.id,
      explain: `${form} means ${primaryGloss(word)}.`,
    }
  }
  const sentence =
    (library.sentences.get(word.id) ?? []).find((s) => s.jp.includes(s.form)) ??
    library.sentences.get(word.id)?.[0]
  const blanked = sentence ? sentence.jp.replace(sentence.form, '＿＿') : form
  const pool = [...library.vocab.values()].filter(
    (v) =>
      v.id !== word.id &&
      v.forms.length > 0 &&
      v.senses[0]!.pos.some((p) => word.senses[0]!.pos.includes(p)),
  )
  const distractors = seededPick(
    pool.length >= 3 ? pool : [...library.vocab.values()].filter((v) => v.id !== word.id),
    3,
    seed,
  )
  const choices = seededPick([word, ...distractors], 4, seed + 'o').map<Choice>((v) => {
    const f = displayForm(v)
    return { id: v.id, label: f, sub: readingsFor(v, f)[0], lang: 'ja' }
  })
  return {
    kind: 'Fill the blank',
    promptJa: blanked,
    promptEn: sentence?.en,
    small: true,
    choices,
    correctId: word.id,
    explain: `The word is ${form}.`,
  }
}
