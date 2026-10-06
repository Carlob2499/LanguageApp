import { Button } from '@/app/components/Button'
import { Crack } from '@/app/components/Crack'
import { StrokeGlyph } from '@/app/components/StrokeGlyph'
import type { StrokeItem } from '@/packs/ja/types'

import styles from './Welcome.module.css'

export interface WelcomeIntroProps {
  /** The hero decoration mounts only once this is true, inside a box of fixed height. */
  showHero: boolean
  gold?: StrokeItem | undefined
  replay?: number
  onReplay?: (() => void) | undefined
  onStart?: (() => void) | undefined
  /** Prerendered copy: the button is marked not yet usable until the live tree takes over. */
  inert?: boolean
}

/**
 * The first screen's static part: headline, lede and Start. It has no router or store
 * dependency so the build can prerender it into index.html and the first paint never waits
 * for JavaScript; the client then renders the same markup in its place.
 */
export function WelcomeIntro({
  showHero,
  gold,
  replay = 0,
  onReplay,
  onStart,
  inert = false,
}: WelcomeIntroProps) {
  return (
    <>
      <div className={styles.hero} data-ready={showHero ? 'true' : undefined}>
        {showHero && (
          <>
            <div className={styles.glyphWrap} onClick={onReplay} role="presentation">
              {gold ? (
                <StrokeGlyph
                  item={gold}
                  speed={380}
                  replayKey={replay}
                  className={styles.glyph}
                  label="金, gold, drawn stroke by stroke"
                />
              ) : (
                <span className={`${styles.glyphText} ja-display`} lang="ja">
                  金
                </span>
              )}
            </div>
            <div className={styles.journeyWrap}>
              <ol
                className={styles.journey}
                aria-label="How Kintsugi works: meet a kanji, forget it and it cracks, recall it and the crack turns gold"
              >
                <li className={styles.tile} aria-hidden="true">
                  <span className={styles.tileKanji} lang="ja">
                    日
                  </span>
                </li>
                <li className={`${styles.tile} ${styles.tileCracked}`} aria-hidden="true">
                  <Crack seed="welcome" gold={0} />
                  <span className={styles.tileKanji} lang="ja">
                    日
                  </span>
                </li>
                <li className={`${styles.tile} ${styles.tileGold}`} aria-hidden="true">
                  <Crack seed="welcome" gold={1} />
                  <span className={styles.tileKanji} lang="ja">
                    日
                  </span>
                </li>
              </ol>
              <p className={styles.journeyCaption} aria-hidden="true">
                Meet · Crack · Repair
              </p>
            </div>
          </>
        )}
      </div>
      <p className={styles.eyebrow}>Kintsugi</p>
      <h1>Mistakes, repaired in gold.</h1>
      <p className={styles.lede}>
        Kanji and words from kana to N1, one short session a day. Every kanji writes itself in front
        of you, stroke by stroke.
      </p>
      <Button
        variant="primary"
        size="large"
        onClick={onStart}
        aria-disabled={inert ? 'true' : undefined}
      >
        Start
      </Button>
    </>
  )
}
