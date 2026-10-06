import { useEffect, useState, type ReactNode } from 'react'

import { useLocation } from '@/app/router/index'

import { Ambient } from './Ambient'
import { Grain } from './Grain'
import styles from './Shell.module.css'
import { TabBar } from './TabBar'

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const focused = pathname === '/review' || pathname === '/welcome'
  // The ambient layers arrive after the first paint so they never sit in the critical path.
  const [ambient, setAmbient] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setAmbient(true), 1200)
    return () => window.clearTimeout(id)
  }, [])
  return (
    <div className={styles.shell} data-focused={focused ? 'true' : undefined}>
      {ambient && <Ambient intensity={focused ? 0.6 : 1} />}
      {ambient && <Grain />}
      <a className="visually-hidden" href="#main">
        Skip to content
      </a>
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      {!focused && <TabBar />}
    </div>
  )
}
