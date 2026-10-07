import { create } from 'zustand'

import { useSettings } from '@/app/study/settings'
import { db, withReopen, type SettingRow } from '@/db'

import {
  decodeKey,
  deriveKeys,
  encodeKey,
  generateSyncKey,
  open,
  readVersion,
  seal,
} from './crypto'
import { isSnapshot, mergeSnapshots, type Snapshot } from './merge'

/** Stored in the settings table under `sync`; never mirrored to localStorage. */
export interface SyncState {
  key: string
  version: number
  lastSyncedAt: number | null
  /** Pushes on `pushDay`, to stay under the Blob free tier's monthly operations. */
  pushDay: string
  pushes: number
}

export const PUSHES_PER_DAY = 60
const MIN_GAP_MS = 90_000

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'unconfigured' | 'offline' | 'error'

interface SyncStore {
  state: SyncState | null
  status: SyncStatus
  message?: string | undefined
  loaded: boolean
  load: () => Promise<void>
  enable: (keyText?: string) => Promise<string | undefined>
  disable: () => Promise<void>
  sync: (reason: 'manual' | 'session' | 'replace') => Promise<void>
  /** True when the server copy could not be read with this key; offers a replace. */
  unreadable?: boolean
}

async function readState(): Promise<SyncState | null> {
  const row = await withReopen(() => db.settings.get('sync'))
  const v = row?.value as Partial<SyncState> | undefined
  return v && typeof v.key === 'string' ? (v as SyncState) : null
}

async function writeState(state: SyncState | null): Promise<void> {
  await withReopen(async () => {
    if (state) await db.settings.put({ key: 'sync', value: state })
    else await db.settings.delete('sync')
  })
}

function readLocal(): Promise<Snapshot> {
  return Promise.all([
    db.cards.toArray(),
    db.reviews.toArray(),
    db.days.toArray(),
    db.settings.toArray(),
    db.notes.toArray(),
  ]).then(([cards, reviews, days, settings, notes]) => ({
    v: 1 as const,
    exportedAt: Date.now(),
    cards,
    reviews,
    days,
    settings,
    notes,
  }))
}

/**
 * Reads this device's rows, merges the remote snapshot into them and writes the result, all in
 * one transaction, so a grade made while the network request was in flight is never lost.
 */
async function mergeIntoLocal(remote: Snapshot | undefined): Promise<Snapshot> {
  return withReopen(() =>
    db.transaction('rw', [db.cards, db.reviews, db.days, db.settings, db.notes], async () => {
      const local = await readLocal()
      if (!remote) return local
      const merged = mergeSnapshots(local, remote)
      await db.cards.clear()
      await db.cards.bulkPut(merged.cards)
      await db.reviews.clear()
      await db.reviews.bulkAdd(
        merged.reviews.map((r) => {
          const row = { ...r }
          delete row.id
          return row
        }),
      )
      await db.days.clear()
      await db.days.bulkPut(merged.days)
      const keep = new Set(['sync', 'session'])
      const kept = local.settings.filter((r) => keep.has(r.key))
      await db.settings.clear()
      await db.settings.bulkPut([
        ...merged.settings.filter((r) => !keep.has(r.key)),
        ...kept,
      ] as SettingRow[])
      await db.notes.clear()
      await db.notes.bulkPut(merged.notes)
      return merged
    }),
  )
}

async function gzip(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data.slice()]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export const useSync = create<SyncStore>((set, get) => ({
  state: null,
  status: 'off',
  loaded: false,
  async load() {
    const state = await readState()
    set({ state, status: state ? 'idle' : 'off', loaded: true })
  },
  async enable(keyText) {
    const bytes = keyText ? decodeKey(keyText) : generateSyncKey()
    if (!bytes) return 'That key does not look right. It has 26 letters and digits.'
    const state: SyncState = {
      key: encodeKey(bytes),
      version: 0,
      lastSyncedAt: null,
      pushDay: today(),
      pushes: 0,
    }
    await writeState(state)
    set({ state, status: 'idle', message: undefined })
    await get().sync('manual')
    return undefined
  },
  async disable() {
    await writeState(null)
    set({ state: null, status: 'off', message: undefined })
  },
  async sync(reason) {
    const { state, status } = get()
    if (!state || status === 'syncing') return
    if (reason === 'session') {
      const recent = state.lastSyncedAt && Date.now() - state.lastSyncedAt < MIN_GAP_MS
      const exhausted = state.pushDay === today() && state.pushes >= PUSHES_PER_DAY
      if (recent || exhausted) return
    }
    if (!navigator.onLine) {
      set({ status: 'offline', message: 'Offline. Reviews are saved here; sync waits.' })
      return
    }
    set({ status: 'syncing', message: undefined })
    try {
      const keyBytes = decodeKey(state.key)
      if (!keyBytes) throw new Error('Stored sync key is unreadable')
      const { aes, id, auth } = await deriveKeys(keyBytes)
      // The id and token travel in headers, never in the URL, so request logs never record them.
      const url = '/api/sync'
      const headers = { 'x-sync-id': id, 'x-sync-auth': auth }

      const res = await fetch(url, { cache: 'no-store', headers })
      if (res.status === 503) {
        set({ status: 'unconfigured', message: 'Sync is not switched on for this deployment yet.' })
        return
      }
      let remoteVersion = 0
      let remote: Snapshot | undefined
      if (res.ok) {
        const payload = new Uint8Array(await res.arrayBuffer())
        remoteVersion = readVersion(payload)
        if (reason !== 'replace') {
          let parsed: unknown
          try {
            parsed = JSON.parse(
              new TextDecoder().decode(await gunzip(await open(aes, payload, id))),
            )
          } catch {
            parsed = undefined
          }
          if (!isSnapshot(parsed)) {
            set({
              status: 'error',
              unreadable: true,
              message:
                'The copy on the server cannot be read with this key. You can replace it with what is on this device.',
            })
            return
          }
          remote = parsed
        }
      } else if (res.status !== 404) {
        throw new Error(`Server answered ${res.status}`)
      }
      const merged = await mergeIntoLocal(remote)
      if (remote) await useSettings.getState().load()

      const body = await seal(
        aes,
        remoteVersion + 1,
        await gzip(new TextEncoder().encode(JSON.stringify(merged))),
        id,
      )
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: {
          ...headers,
          'If-Match': String(remoteVersion),
          'Content-Type': 'application/octet-stream',
        },
        body: body.slice(),
      })
      if (putRes.status === 403) {
        set({
          status: 'error',
          message: 'The server refused this key. Turn sync off and on again.',
        })
        return
      }
      if (putRes.status === 413) {
        set({ status: 'error', message: 'Your progress is too large to sync in one piece.' })
        return
      }
      if (putRes.status === 409) {
        // Another device wrote in between; the next sync merges again.
        set({ status: 'idle', message: 'Another device just synced. Tap again to merge.' })
        return
      }
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`)

      const day = today()
      const next: SyncState = {
        ...state,
        version: remoteVersion + 1,
        lastSyncedAt: Date.now(),
        pushDay: day,
        pushes: state.pushDay === day ? state.pushes + 1 : 1,
      }
      await writeState(next)
      set({ state: next, status: 'idle', message: undefined, unreadable: false })
    } catch (error) {
      set({ status: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  },
}))
