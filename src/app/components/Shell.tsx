import type { ReactNode } from 'react'

import { Link, useLocation } from '@/app/router/index'

import styles from './Shell.module.css'

const TABS = [
  { to: '/', label: 'Today', exact: true },
  { to: '/library', label: 'Library', exact: false },
  { to: '/about', label: 'Sources', exact: false },
] as const

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const focused = pathname === '/review' || pathname === '/welcome'
  return (
    <div className={styles.shell}>
      <a className="visually-hidden" href="#main">
        Skip to content
      </a>
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      {!focused && (
        <nav className={styles.tabs} aria-label="Primary">
          {TABS.map((tab) => (
            <Link key={tab.to} to={tab.to} exact={tab.exact} className={styles.tab}>
              {tab.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
