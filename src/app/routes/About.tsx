import { useEffect, useState } from 'react'

import { Icon } from '@/app/components/Icon'
import { Link } from '@/app/router/index'
import type { Provenance } from '@/packs/schema'

import styles from './About.module.css'

const LIBRARIES = [
  ['React', 'MIT'],
  ['Dexie', 'Apache-2.0'],
  ['ts-fsrs (FSRS-6)', 'MIT'],
  ['Motion', 'MIT'],
  ['Workbox', 'MIT'],
  ['wanakana', 'MIT'],
  ['Zen Kaku Gothic New, Shippori Mincho, Instrument Sans, Fraunces', 'SIL OFL 1.1'],
]

export function AboutRoute() {
  const [prov, setProv] = useState<Provenance>()
  const [error, setError] = useState(false)
  useEffect(() => {
    void fetch('/packs/ja/provenance.json')
      .then((r) =>
        r.ok ? (r.json() as Promise<Provenance>) : Promise.reject(new Error(String(r.status))),
      )
      .then(setProv)
      .catch(() => setError(true))
  }, [])

  return (
    <section className={styles.about} aria-labelledby="about-title">
      <header className={styles.header}>
        <Link to="/settings" className={styles.back} aria-label="Back to settings">
          <Icon name="chevron" className={styles.backIcon} />
        </Link>
        <h1 id="about-title">Sources</h1>
      </header>
      <p className={styles.lede}>
        Every reading, meaning, stroke, sentence and level in Kintsugi comes from the open datasets
        below, through a build-time pipeline that records what it took and how it changed it.
        Nothing is written from memory.
      </p>
      <p className={styles.note}>
        <Icon name="sources" size={18} />
        JLPT levels shown in this app are unofficial. The Japan Foundation has published no level
        lists since the 2010 revision; the levels here are Jonathan Waller's community estimates.
      </p>

      {prov && (
        <p className={styles.updated}>
          Data built {prov.generated.slice(0, 10)}. The dictionaries are regenerated daily upstream;
          this app refreshes them with <code>npm run data:update</code>, at least quarterly, as the
          EDRDG licence requires.
        </p>
      )}
      {error && (
        <p className={styles.note}>
          The provenance manifest couldn't be loaded. Try again once you're online.
        </p>
      )}

      <ul className={styles.cards} role="list">
        {prov?.sources.map((s) => (
          <li key={s.id} className={styles.card}>
            <h2 className={styles.cardTitle}>
              <a href={s.homepage} target="_blank" rel="noreferrer">
                {s.name}
              </a>
            </h2>
            <p className={styles.licence}>
              <a href={s.licence.url} target="_blank" rel="noreferrer">
                {s.licence.name}
              </a>
            </p>
            <p className={styles.attribution}>{s.attribution}</p>
            {s.licence.notes && <p className={styles.notes}>{s.licence.notes}</p>}
            <p className={styles.meta}>
              Fetched {s.downloadedAt.slice(0, 10)}
              {s.lastModified
                ? ` · upstream ${new Date(s.lastModified).toISOString().slice(0, 10)}`
                : ''}{' '}
              · sha256 {s.sha256.slice(0, 12)}
            </p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="audio-title" className={styles.block}>
        <h2 id="audio-title" className={styles.blockTitle}>
          Recordings
        </h2>
        <p className={styles.attribution}>
          Sentence recordings come from Tatoeba contributors and ship only when the speaker released
          them under CC BY, CC BY-SA, CC BY-NC or CC0. Each clip names its speaker and licence where
          it plays. The full list is in{' '}
          <a href="/audio/CREDITS.txt" target="_blank" rel="noreferrer">
            audio/CREDITS.txt
          </a>
          . Everything else is read by your device's own Japanese voice.
        </p>
      </section>

      <section aria-labelledby="files-title" className={styles.block}>
        <h2 id="files-title" className={styles.blockTitle}>
          What was built
        </h2>
        <ul className={styles.files} role="list">
          {prov?.files
            .filter((f) => f.kind !== 'index')
            .map((f) => (
              <li key={f.path} className={styles.file}>
                <span className={styles.filePath}>{f.path}</span>
                <span className={styles.fileMeta}>
                  {f.records} records · {(f.bytes / 1024).toFixed(0)} kB
                </span>
                <span className={styles.fileTransform}>{f.transform}</span>
              </li>
            ))}
        </ul>
      </section>

      <section aria-labelledby="libs-title" className={styles.block}>
        <h2 id="libs-title" className={styles.blockTitle}>
          Software
        </h2>
        <ul className={styles.libs} role="list">
          {LIBRARIES.map(([name, licence]) => (
            <li key={name}>
              <span>{name}</span>
              <span className={styles.fileMeta}>{licence}</span>
            </li>
          ))}
        </ul>
        <p className={styles.meta}>
          Derived data files keep their share-alike licences. The app's code is separate from the
          data it ships.
        </p>
      </section>
    </section>
  )
}
