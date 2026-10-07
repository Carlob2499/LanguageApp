import { create } from 'zustand'

import { DEFAULT_REMINDER, type ReminderSettings } from './reminders'

import type { Level } from '@/packs/ja/levels'

export interface Settings {
  onboarded: boolean
  /** Level the learner is working through. */
  level: Level
  newPerDay: number
  maxReviews: number
  backlogGate: number
  desiredRetention: number
  theme: 'auto' | 'dark' | 'light'
  /** Multiplier for Japanese text size: 1 = default. */
  jaTextScale: 1 | 1.15 | 1.3
  /** False until the learner reads kana: sessions then draw kana cards and kanji wait. */
  kanaReady: boolean
  /** Placement result, kept so Settings can show how the level was chosen. */
  placedAt?: Level
  /** Local reminder; device-specific, never synced. */
  reminder: ReminderSettings
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  level: 'N5',
  newPerDay: 10,
  maxReviews: 200,
  backlogGate: 100,
  desiredRetention: 0.9,
  theme: 'auto',
  jaTextScale: 1,
  kanaReady: true,
  reminder: DEFAULT_REMINDER,
}

const SETTINGS_KEYS = new Set<string>([...Object.keys(DEFAULT_SETTINGS), 'placedAt'])

/**
 * Settings live in IndexedDB (so backups and sync carry them) and are mirrored to localStorage
 * so the first paint never waits for a database connection.
 */
const MIRROR_KEY = 'kintsugi.settings'

function readMirror(): Partial<Settings> {
  try {
    const raw = localStorage.getItem(MIRROR_KEY)
    return raw ? (JSON.parse(raw) as Partial<Settings>) : {}
  } catch {
    return {}
  }
}

function writeMirror(settings: Settings): void {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(settings))
  } catch {
    // Private mode or a full quota: the database copy still holds the truth.
  }
}

interface SettingsStore {
  settings: Settings
  loaded: boolean
  load: () => Promise<void>
  update: (patch: Partial<Settings>) => Promise<void>
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  async load() {
    const mirrored = { ...DEFAULT_SETTINGS, ...readMirror() }
    applyTheme(mirrored)
    set({ settings: mirrored, loaded: true })
    const { db, withReopen } = await import('@/db')
    // The settings table also holds the session in progress and the sync state; only rows
    // that are real settings may shape the store.
    const rows = await withReopen(() => db.settings.toArray())
    const stored = Object.fromEntries(
      rows.filter((r) => SETTINGS_KEYS.has(r.key)).map((r) => [r.key, r.value]),
    ) as Partial<Settings>
    if (Object.keys(stored).length === 0) return
    const settings = { ...DEFAULT_SETTINGS, ...stored }
    writeMirror(settings)
    applyTheme(settings)
    set({ settings })
  },
  async update(patch) {
    const settings = { ...get().settings, ...patch }
    applyTheme(settings)
    writeMirror(settings)
    set({ settings })
    const { db, withReopen } = await import('@/db')
    await withReopen(() =>
      db.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value }))),
    )
  },
}))

let autoTheme = false
let listening = false

function systemTheme(): 'light' | 'dark' {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export function applyTheme(settings: Settings): void {
  if (!listening && typeof matchMedia === 'function') {
    listening = true
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (autoTheme) document.documentElement.setAttribute('data-theme', systemTheme())
    })
  }
  const root = document.documentElement
  // "Auto" resolves to an explicit attribute so every component sees one theme, and follows the
  // system while it changes.
  root.setAttribute('data-theme', settings.theme === 'auto' ? systemTheme() : settings.theme)
  autoTheme = settings.theme === 'auto'
  root.style.setProperty('--ja-scale', String(settings.jaTextScale))
}
