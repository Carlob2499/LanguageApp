import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import styles from './Shell.module.css'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className="visually-hidden" href="#main">
        Skip to content
      </a>
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      <nav className={styles.tabs} aria-label="Primary">
        <Link
          to="/"
          className={styles.tab}
          activeProps={{ 'aria-current': 'page' }}
          activeOptions={{ exact: true }}
        >
          Today
        </Link>
        <Link to="/about" className={styles.tab} activeProps={{ 'aria-current': 'page' }}>
          Sources
        </Link>
      </nav>
    </div>
  )
}
