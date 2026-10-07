/** Storage durability helpers. Safari evicts site data after a week of disuse unless persisted. */

export interface StorageStatus {
  persisted: boolean | null
  usageBytes: number | null
  quotaBytes: number | null
}

/** Asks the browser to keep this origin's data; a no-op where the API is missing. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function storageStatus(): Promise<StorageStatus> {
  const out: StorageStatus = { persisted: null, usageBytes: null, quotaBytes: null }
  try {
    if (navigator.storage?.persisted) out.persisted = await navigator.storage.persisted()
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate()
      out.usageBytes = e.usage ?? null
      out.quotaBytes = e.quota ?? null
    }
  } catch {
    // Private mode or an older browser: leave the unknowns.
  }
  return out
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} kB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** True for the browser's "no room left" errors, whatever name they use. */
export function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const name = error.name
  const inner = (error as { inner?: { name?: string } }).inner?.name
  return (
    name === 'QuotaExceededError' || inner === 'QuotaExceededError' || /quota/i.test(error.message)
  )
}
