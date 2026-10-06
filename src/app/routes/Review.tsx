import { useEffect, useRef, useState, type FormEvent } from 'react'

import { Button } from '@/app/components/Button'
import { Crack } from '@/app/components/Crack'
import { Furigana } from '@/app/components/Furigana'
import { GoldFlecks } from '@/app/components/GoldFlecks'
import { Icon } from '@/app/components/Icon'
import { Sheet } from '@/app/components/Sheet'
import { Speak } from '@/app/components/Speak'
import { StrokeGlyph } from '@/app/components/StrokeGlyph'
import { Tile } from '@/app/components/Tile'
import { Vessel } from '@/app/components/Vessel'
import { useNavigate } from '@/app/router/index'
import { useStudySession } from '@/app/study/useStudySession'
import { GRADE_LABELS } from '@/engine/session'
import type { Grade, StudyCard } from '@/engine/types'
import { displayForm, JA_CARD_TYPES, primaryGloss, readingsFor } from '@/packs/ja/cards'
import { checkReading } from '@/packs/ja/grading'
import { sentencesFor, strokesFor } from '@/packs/ja/loader'
import type { Level } from '@/packs/ja/levels'
import type { KanjiItem, SentenceItem, StrokeItem, VocabItem } from '@/packs/ja/types'

import styles from './Review.module.css'

const GRADE_ICON: Record<Grade, 'crack' | 'chevron' | 'check' | 'spark'> = {
  1: 'crack',
  2: 'chevron',
  3: 'check',
  4: 'spark',
}

export function ReviewRoute() {
  const session = useStudySession()
  const navigate = useNavigate()
  const [cracking, setCracking] = useState(false)

  /** Again cracks the tile for a beat before the card moves on. */
  function gradeWithCrack(g: Grade) {
    if (g === 1 && !cracking) {
      setCracking(true)
      window.setTimeout(() => {
        setCracking(false)
        void session.grade(1)
      }, 460)
      return
    }
    void session.grade(g)
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return
      if (event.key === ' ' && !session.revealed) {
        event.preventDefault()
        session.reveal()
      } else if (session.revealed && ['1', '2', '3', '4'].includes(event.key)) {
        gradeWithCrack(Number(event.key) as Grade)
      } else if (session.revealed && event.key === 'Enter' && session.suggestedGrade) {
        event.preventDefault()
        gradeWithCrack(session.suggestedGrade)
      } else if (event.key.toLowerCase() === 'u' && session.canUndo) {
        void session.undo()
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
        <p className={styles.muted}>Setting the table…</p>
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
        <Vessel
          fill={1}
          seams={Math.min(6, Math.ceil(session.done / 4))}
          size={160}
          label="Today's vessel, full"
        />
        <p className={styles.eyebrow}>{session.complete ? 'Session complete' : 'All clear'}</p>
        <h1>
          {session.complete ? `${session.done} cards, repaired.` : 'Nothing is due right now.'}
        </h1>
        <p className={styles.muted}>
          {session.complete
            ? 'The next ones come back on their own schedule. Today counts.'
            : 'Your next reviews arrive on their own schedule.'}
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
          onClick={() => void session.undo()}
        >
          <Icon name="undo" />
        </button>
      </header>

      {item ? (
        <CardFace
          key={card.key}
          card={card}
          item={item}
          session={session}
          cracking={cracking}
          onGrade={gradeWithCrack}
        />
      ) : (
        <div className={styles.center} role="alert">
          <p>This card's word is missing from the pack. Skipping it.</p>
          <Button onClick={() => void session.grade(3)}>Skip</Button>
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
            <span>Think of the answer, then reveal.</span>
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
        <Sheet open={sheet} onClose={() => setSheet(false)} title={form}>
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
  const inputRef = useRef<HTMLInputElement>(null)
  const accepted = readingsFor(item, displayForm(item))

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
    </form>
  )
}
