import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'

import { useLocation } from '@/app/router/index'

import { Ambient } from './Ambient'
import { Grain } from './Grain'
import styles from './Shell.module.css'
import { TabBar } from './TabBar'

const Palette = lazy(() => import('./Palette'))

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
  const wide = pathname.startsWith('/library')
  const [palette, setPalette] = useState<'search' | 'shortcuts' | null>(null)
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
      <a className="visually-hidden" href="#main">
        Skip to content
      </a>
      <main id="main" className={styles.main} data-wide={wide ? 'true' : undefined} tabIndex={-1}>
        {children}
      </main>
      {!focused && <TabBar onSearch={() => setPalette('search')} />}
      {palette && (
        <Suspense fallback={null}>
          <Palette initialView={palette} onClose={() => setPalette(null)} />
        </Suspense>
      )}
    </div>
  )
}
