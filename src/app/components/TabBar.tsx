import { Link, useLocation } from '@/app/router/index'

import { Icon, type IconName } from './Icon'
import styles from './TabBar.module.css'

const TABS: Array<{ to: string; label: string; icon: IconName; exact: boolean }> = [
  { to: '/', label: 'Today', icon: 'today', exact: true },
  { to: '/library', label: 'Library', icon: 'library', exact: false },
  { to: '/progress', label: 'Progress', icon: 'progress', exact: false },
  { to: '/settings', label: 'Settings', icon: 'settings', exact: false },
]

/**
 * Floating glass pill with a gold underglow that glides to the active tab. The glide is a CSS
 * transition on a custom property, so the tab bar costs no animation library in the first paint.
 */
export function TabBar({ onSearch }: { onSearch?: (() => void) | undefined }) {
  const { pathname } = useLocation()
  const activeIndex = Math.max(
    0,
    TABS.findIndex((tab) => (tab.exact ? pathname === tab.to : pathname.startsWith(tab.to))),
  )
  return (
    <nav className={styles.bar} aria-label="Primary">
      <div
        className={styles.pill}
        style={{ '--active': activeIndex, '--count': TABS.length } as React.CSSProperties}
      >
        <span className={styles.glow} aria-hidden="true" />
        {TABS.map((tab) => (
          <Link key={tab.to} to={tab.to} exact={tab.exact} className={styles.tab}>
            <Icon name={tab.icon} size={22} className={styles.icon} />
            <span className={styles.label}>{tab.label}</span>
          </Link>
        ))}
      </div>
      {onSearch && (
        <button type="button" className={styles.search} onClick={onSearch}>
          <Icon name="spark" size={18} />
          <span>Search</span>
          <kbd className={styles.kbd}>⌘K</kbd>
        </button>
      )}
    </nav>
  )
}
