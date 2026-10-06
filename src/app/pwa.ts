import { registerSW } from 'virtual:pwa-register'

type Listener = (state: UpdateState) => void

export interface UpdateState {
  /** A new version is installed and waiting; activating it reloads the page. */
  needRefresh: boolean
  /** The app shell is fully cached and works offline. */
  offlineReady: boolean
}

const state: UpdateState = { needRefresh: false, offlineReady: false }
const listeners = new Set<Listener>()
let activate: ((reload?: boolean) => Promise<void>) | undefined

function emit() {
  for (const fn of listeners) fn({ ...state })
}

export function subscribeUpdates(fn: Listener): () => void {
  listeners.add(fn)
  fn({ ...state })
  return () => listeners.delete(fn)
}

/** Apply a waiting update. Callers must only do this when no review is in progress. */
export async function applyUpdate(): Promise<void> {
  if (activate) await activate(true)
}

export function registerServiceWorker(): void {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
  activate = registerSW({
    immediate: true,
    onNeedRefresh() {
      state.needRefresh = true
      emit()
    },
    onOfflineReady() {
      state.offlineReady = true
      emit()
    },
    onRegisterError(error: unknown) {
      console.warn('Service worker registration failed', error)
    },
  })
}
