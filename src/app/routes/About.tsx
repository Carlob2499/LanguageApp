import styles from './About.module.css'

export function AboutRoute() {
  return (
    <section className={styles.about} aria-labelledby="about-title">
      <h1 id="about-title">Sources</h1>
      <p className={styles.lede}>
        Kintsugi is built on open dictionaries and corpora. This screen lists each one, its licence,
        and what we changed. It fills in as the content pipeline lands.
      </p>
      <p className={styles.note}>
        JLPT levels shown in this app are unofficial. The Japan Foundation has not published level
        lists since the 2010 revision.
      </p>
    </section>
  )
}
