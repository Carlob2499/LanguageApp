import { useEffect, useState } from 'react'

import { PUSHES_PER_DAY, useSync } from '@/app/sync/store'

import { Button } from './Button'
import styles from './SyncPanel.module.css'

function pairingUrl(key: string): string {
  return `${window.location.origin}/settings#sync=${encodeURIComponent(key)}`
}

/**
 * Settings section for device-to-device sync. The key is shown as text and as a QR code that
 * opens Settings on the other device with the key in the URL fragment, which never reaches a
 * server. No account, no password: whoever has the key has the snapshot.
 */
export function SyncPanel({ joinKey }: { joinKey?: string | undefined }) {
  const { state, status, message, loaded, load, enable, disable, sync } = useSync()
  const [joining, setJoining] = useState(joinKey !== undefined)
  const [keyText, setKeyText] = useState(joinKey ?? '')
  const [error, setError] = useState<string>()
  const [qr, setQr] = useState<string>()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!loaded) void load()
  }, [loaded, load])

  useEffect(() => {
    if (!state) return
    let cancelled = false
    void import('qrcode')
      .then((mod) =>
        mod.toDataURL(pairingUrl(state.key), {
          margin: 1,
          width: 192,
          color: { dark: '#1c0d0b', light: '#f6f1e7' },
        }),
      )
      .then((url) => {
        if (!cancelled) setQr(url)
      })
    return () => {
      cancelled = true
    }
  }, [state])

  async function join() {
    setError(undefined)
    const problem = await enable(keyText)
    if (problem) setError(problem)
    else setJoining(false)
  }

  async function copy() {
    if (!state) return
    try {
      await navigator.clipboard.writeText(state.key)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Copying is blocked here; read the key out instead.')
    }
  }

  if (!loaded) return null

  if (!state) {
    return (
      <div className={styles.panel}>
        <p className={styles.text}>
          Keep two devices in step without an account. A sync key stays on your devices; the server
          stores only an encrypted snapshot it cannot read.
        </p>
        {joining ? (
          <div className={styles.join}>
            <label className={styles.label} htmlFor="sync-key">
              Key from the other device
            </label>
            <input
              id="sync-key"
              className={styles.input}
              value={keyText}
              onChange={(e) => setKeyText(e.target.value)}
              placeholder="ABCD-EFGH-…"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="characters"
            />
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className={styles.row}>
              <Button variant="primary" onClick={() => void join()}>
                Join
              </Button>
              <Button variant="quiet" onClick={() => setJoining(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.row}>
            <Button variant="primary" onClick={() => void enable()}>
              Turn on sync
            </Button>
            <Button onClick={() => setJoining(true)}>I have a key</Button>
          </div>
        )}
      </div>
    )
  }

  const statusLine =
    status === 'syncing'
      ? 'Syncing…'
      : status === 'unconfigured' || status === 'offline' || status === 'error'
        ? (message ?? 'Something went wrong.')
        : state.lastSyncedAt
          ? `Synced ${new Date(state.lastSyncedAt).toLocaleString()} · snapshot ${state.version}`
          : 'Not synced yet.'

  return (
    <div className={styles.panel}>
      <div className={styles.keyRow}>
        <div>
          <p className={styles.label}>Your sync key</p>
          <p className={styles.key} data-testid="sync-key">
            {state.key}
          </p>
          <p className={styles.text}>
            Type it on the other device, or scan the code. Anyone with the key can read and change
            your progress, so share it like a password.
          </p>
        </div>
        {qr && (
          <img
            className={styles.qr}
            src={qr}
            width={96}
            height={96}
            alt={`QR code that opens Settings on another device with sync key ${state.key}`}
          />
        )}
      </div>
      <p className={styles.status} role="status" aria-live="polite" data-status={status}>
        {statusLine}
        {message && status === 'idle' ? ` ${message}` : ''}
      </p>
      <div className={styles.row}>
        <Button
          variant="primary"
          onClick={() => void sync('manual')}
          disabled={status === 'syncing'}
        >
          Sync now
        </Button>
        <Button onClick={() => void copy()}>{copied ? 'Copied' : 'Copy key'}</Button>
        <Button variant="quiet" onClick={() => void disable()}>
          Turn off
        </Button>
      </div>
      <p className={styles.fine}>
        Syncs after each session and on demand, at most {PUSHES_PER_DAY} uploads a day. Turning off
        keeps everything on this device.
      </p>
    </div>
  )
}
