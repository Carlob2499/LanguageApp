import { useSyncExternalStore } from 'react'

/** True while `query` matches; re-renders on change. False during the first server-less render. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Wide enough for two panes side by side. */
export const SPLIT_QUERY = '(min-width: 1100px)'
