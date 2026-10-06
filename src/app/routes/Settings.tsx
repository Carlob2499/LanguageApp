import { useEffect, useState } from 'react'

import { Icon } from '@/app/components/Icon'
import { Link } from '@/app/router/index'
import { useSettings, type Settings } from '@/app/study/settings'
import { LEVELS } from '@/packs/ja/levels'
import { loadIndex } from '@/packs/ja/loader'

import styles from './Settings.module.css'

export function SettingsRoute() {
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const [dataDate, setDataDate] = useState<string>()

  useEffect(() => {
    void loadIndex().then((i) => setDataDate(i.generated.slice(0, 10)))
  }, [])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    void update({ [key]: value })

  return (
    <section className={styles.settings} aria-labelledby="settings-title">
      <h1 id="settings-title">Settings</h1>

      <Group title="Study">
        <Row label="Level" hint="Where new cards come from.">
          <Segmented
            options={LEVELS.map((l) => ({ value: l, label: l }))}
            value={settings.level}
            onChange={(v) => set('level', v)}
          />
        </Row>
        <Row label="New cards per day" hint="Reviews come on top of these.">
          <Segmented
            options={[5, 10, 15, 20].map((n) => ({ value: n, label: String(n) }))}
            value={settings.newPerDay}
            onChange={(v) => set('newPerDay', v)}
          />
        </Row>
        <Row
          label="Target recall"
          hint="Higher means more reviews, fewer lapses. 90% is the balanced default."
        >
          <Segmented
            options={[0.8, 0.85, 0.9, 0.95].map((r) => ({
              value: r,
              label: `${Math.round(r * 100)}%`,
            }))}
            value={settings.desiredRetention}
            onChange={(v) => set('desiredRetention', v)}
          />
        </Row>
      </Group>

      <Group title="Appearance">
        <Row label="Theme">
          <Segmented
            options={[
              { value: 'auto' as const, label: 'Auto' },
              { value: 'dark' as const, label: 'Lacquer' },
              { value: 'light' as const, label: 'Paper' },
            ]}
            value={settings.theme}
            onChange={(v) => set('theme', v)}
          />
        </Row>
        <Row label="Japanese text size">
          <Segmented
            options={[
              { value: 1 as const, label: 'A' },
              { value: 1.15 as const, label: 'A+' },
              { value: 1.3 as const, label: 'A++' },
            ]}
            value={settings.jaTextScale}
            onChange={(v) => set('jaTextScale', v)}
          />
        </Row>
      </Group>

      <Group title="About">
        <Link to="/about" className={styles.link}>
          <Icon name="sources" size={20} />
          <span>
            Sources and licences
            {dataDate && <span className={styles.linkMeta}>Data from {dataDate}</span>}
          </span>
          <Icon name="chevron" size={18} className={styles.linkChevron} />
        </Link>
        <p className={styles.note}>
          JLPT levels in this app are unofficial. Progress stays on this device until sync arrives.
        </p>
      </Group>
    </section>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.group} aria-label={title}>
      <h2 className={styles.groupTitle}>{title}</h2>
      {children}
    </section>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.rowLabel}>{label}</span>
        {hint && <span className={styles.rowHint}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className={styles.segmented} role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={styles.segment}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
