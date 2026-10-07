import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { applyUpdate, subscribeUpdates } from '@/app/pwa'
import { updateOfferAllowed } from '@/app/pwa-policy'
import { cue, fx } from '@/app/motion/bus'
import { motionTier } from '@/app/motion/tier'
import { useLocation } from '@/app/router/index'
import { useSettings } from '@/app/study/settings'

import { Ambient } from './Ambient'
import { Button } from './Button'
import { Grain } from './Grain'
import styles from './Shell.module.css'
import { TabBar } from './TabBar'

const Palette = lazy(() => import('./Palette'))
const Pulse = lazy(() => import('./Pulse'))
const Stage = lazy(() => import('@/app/motion/Stage'))
const Opening = lazy(() => import('@/app/motion/Opening'))

const OPENED_KEY = 'kintsugi.opened'

/** The opening plays once per visit, for learners who have started, never on the welcome screen. */
function shouldOpen(pathname: string): boolean {
  if (pathname === '/welcome' || motionTier() === 'off') return false
  if (!useSettings.getState().settings.onboarded) return false
  try {
    if (sessionStorage.getItem(OPENED_KEY)) return false
    sessionStorage.setItem(OPENED_KEY, '1')
  } catch {
    return false
  }
  return true
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const focused = pathname === '/review' || pathname === '/welcome' || pathname === '/placement'
  const wide = pathname.startsWith('/library') || pathname === '/placement'
  const [palette, setPalette] = useState<'search' | 'shortcuts' | null>(null)
  const [opening, setOpening] = useState(() => shouldOpen(pathname))
  const closeOpening = useCallback(() => setOpening(false), [])
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  useEffect(() => subscribeUpdates((u) => setNeedRefresh(u.needRefresh)), [])

  // A brush wipe and a swish when a session starts; other pages just cross-fade.
  const previous = useRef(pathname)
  useEffect(() => {
    const from = previous.current
    previous.current = pathname
    if (pathname === '/review' && from !== '/review') {
      fx({ kind: 'slash', heavy: true })
      cue('swish')
    }
  }, [pathname])

  const offerUpdate = updateOfferAllowed(pathname, needRefresh) && !updateDismissed
  // The ambient layers arrive after the first paint so they never sit in the critical path.
  const [ambient, setAmbient] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setAmbient(true), 1200)
    return () => window.clearTimeout(id)
  }, [])

  // Where a keyboard is likely, fetch the palette's chunk during idle time so ⌘K opens at once.
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (min-width: 900px)').matches) return
    const id = window.setTimeout(() => void import('./Palette'), 4000)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPalette((p) => (p ? null : 'search'))
      } else if (event.key === '?' && !isTyping(event.target) && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        setPalette('shortcuts')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={styles.shell} data-focused={focused ? 'true' : undefined}>
      {ambient && <Ambient intensity={focused ? 0.6 : 1} />}
      {ambient && <Grain />}
      {ambient && motionTier() !== 'off' && (
        <Suspense fallback={null}>
          <Stage />
        </Suspense>
      )}
      {opening && (
        <Suspense fallback={null}>
          <Opening onDone={closeOpening} />
        </Suspense>
      )}
      {ambient && pathname !== '/welcome' && (
        <Suspense fallback={null}>
          <Pulse />
        </Suspense>
      )}
      <a className="visually-hidden" href="#main">
        Skip to content
      </a>
      <main id="main" className={styles.main} data-wide={wide ? 'true' : undefined} tabIndex={-1}>
        {children}
      </main>
      {!focused && <TabBar onSearch={() => setPalette('search')} />}
      {offerUpdate && (
        <div className={styles.toast} role="status" aria-live="polite">
          <p className={styles.toastText}>A new version of Kintsugi is ready.</p>
          <Button variant="primary" onClick={() => void applyUpdate()}>
            Restart now
          </Button>
          <Button variant="quiet" onClick={() => setUpdateDismissed(true)}>
            Later
          </Button>
        </div>
      )}
      {palette && (
        <Suspense fallback={null}>
          <Palette initialView={palette} onClose={() => setPalette(null)} />
        </Suspense>
      )}
    </div>
  )
}
