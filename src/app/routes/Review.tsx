import { useNavigate } from '@/app/router/index'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { Beads } from '@/app/components/Beads'
import { Button } from '@/app/components/Button'
import { Seam } from '@/app/components/Seam'
import { Tile } from '@/app/components/Tile'
import { useStudySession } from '@/app/study/useStudySession'
import { GRADE_LABELS } from '@/engine/session'
import type { Grade, StudyCard } from '@/engine/types'
import { displayForm, JA_CARD_TYPES, primaryGloss, readingsFor } from '@/packs/ja/cards'
import { checkReading } from '@/packs/ja/grading'
import type { KanjiItem, VocabItem } from '@/packs/ja/types'

import styles from './Review.module.css'

export function ReviewRoute() {
  const session = useStudySession()
  const navigate = useNavigate()

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return
      if (event.key === ' ' && !session.revealed) {
        event.preventDefault()
        session.reveal()
      } else if (session.revealed && ['1', '2', '3', '4'].includes(event.key)) {
        void session.grade(Number(event.key) as Grade)
      } else if (session.revealed && event.key === 'Enter' && session.suggestedGrade) {
        event.preventDefault()
        void session.grade(session.suggestedGrade)
      } else if (event.key.toLowerCase() === 'u' && session.canUndo) {
        void session.undo()
      } else if (event.key === 'Escape') {
        navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, session])

  if (session.status === 'loading') {
    return (
      <div className={styles.center} role="status" aria-live="polite">
        <p>Setting the table…</p>
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
        <p className={styles.eyebrow}>{session.complete ? 'Session complete' : 'All clear'}</p>
        <h1>
          {session.complete ? `${session.done} cards, repaired.` : 'Nothing is due right now.'}
        </h1>
        <p className={styles.muted}>
          {session.complete
            ? 'Come back when the next ones are due. Today counts.'
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

  return (
    <div className={styles.review}>
      <header className={styles.top}>
        <Button variant="quiet" aria-label="End session" onClick={() => navigate('/')}>
          ✕
        </Button>
        <Beads done={session.done} total={session.total} />
        <Button
          variant="quiet"
          aria-label="Undo last grade"
          disabled={!session.canUndo}
          onClick={() => void session.undo()}
        >
          ↶
        </Button>
      </header>

      {item ? (
        <CardFace key={card.key} card={card} item={item} session={session} />
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
}: {
  card: StudyCard
  item: KanjiItem | VocabItem
  session: Session
}) {
  const isKanji = card.cardType === JA_CARD_TYPES.kanjiMeaning
  const isReading = card.cardType === JA_CARD_TYPES.vocabReading
  const seamProgress = card.lapses > 0 ? Math.min(1, card.reps / (card.lapses * 3 + card.reps)) : 0

  return (
    <>
      <Tile
        cardKey={card.key}
        swipeEnabled={session.revealed}
        seamProgress={seamProgress}
        onSwipe={(d) => void session.grade(d === 'good' ? 3 : 1)}
      >
        {card.lapses > 0 && (
          <Seam progress={session.revealed ? seamProgress : seamProgress * 0.6} />
        )}
        <div className={styles.prompt}>
          <p className={styles.kind}>
            {isKanji ? 'Kanji · meaning' : isReading ? 'Word · reading' : 'Word · meaning'}
          </p>
          <p className={`${styles.hero} ja-display`} lang="ja">
            {isKanji ? (item as KanjiItem).char : displayForm(item as VocabItem)}
          </p>
          {!isKanji && !isReading && (
            <p className={styles.sub} lang="ja">
              {readingsFor(item as VocabItem, displayForm(item as VocabItem))[0]}
            </p>
          )}
        </div>
        <div className={styles.answer} aria-live="polite">
          {session.revealed ? (
            <Answer card={card} item={item} />
          ) : isReading ? (
            <ReadingInput item={item as VocabItem} session={session} />
          ) : null}
        </div>
        <div className={styles.hint}>
          {session.revealed ? (
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
                onClick={() => void session.grade(g)}
              >
                {GRADE_LABELS[g]}
                <kbd className={styles.kbd}>{g}</kbd>
              </Button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function Answer({ card, item }: { card: StudyCard; item: KanjiItem | VocabItem }) {
  if (card.cardType === JA_CARD_TYPES.kanjiMeaning) {
    const kanji = item as KanjiItem
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
      </div>
    )
  }
  const word = item as VocabItem
  const form = displayForm(word)
  return (
    <div className={styles.answerBody}>
      <p className={styles.reading} lang="ja">
        {readingsFor(word, form).join('、')}
      </p>
      <p className={styles.meaning}>{primaryGloss(word)}</p>
      {word.senses[0]!.pos.length > 0 && (
        <p className={styles.pos}>{word.senses[0]!.pos.slice(0, 2).join(', ')}</p>
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
