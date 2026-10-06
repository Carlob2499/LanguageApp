import styles from './Today.module.css'

export function TodayRoute() {
  return (
    <section className={styles.today} aria-labelledby="today-title">
      <p className={styles.eyebrow}>Kintsugi</p>
      <h1 id="today-title">Nothing is due yet.</h1>
      <p className={styles.lede}>
        Your first lesson arrives with the next build. Kanji and words come from licensed
        dictionaries, and every mistake you make here gets repaired in gold.
      </p>
      <p className={`${styles.mark} ja-display`} lang="ja" aria-hidden="true">
        金継ぎ
      </p>
    </section>
  )
}
