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
    // A new worker took control (another tab tapped Restart). Reload this tab only when it is not
    // in the middle of a review or the placement test; otherwise wait until it leaves.
    onNeedReload() {
      const busy = () => ['/review', '/placement'].includes(window.location.pathname)
      if (!busy()) {
        window.location.reload()
        return
      }
      const id = window.setInterval(() => {
        if (!busy()) {
          window.clearInterval(id)
          window.location.reload()
        }
      }, 1000)
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
