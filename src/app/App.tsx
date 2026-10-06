import { useEffect } from 'react'

import { AppRouter } from '@/app/router'
import { useSettings } from '@/app/study/settings'

export function App() {
  const loaded = useSettings((s) => s.loaded)
  const load = useSettings((s) => s.load)
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    // Japanese font faces live in a stylesheet attached after the first paint, so the paint never
    // waits on 120 unicode-range rules or the CJK slices they reference.
    if (document.querySelector('link[data-ja-fonts]')) return
    const id = window.setTimeout(() => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/fonts/ja.css'
      link.dataset['jaFonts'] = 'true'
      document.head.append(link)
    }, 0)
    return () => window.clearTimeout(id)
  }, [])
  if (!loaded) return null
  return <AppRouter />
}
