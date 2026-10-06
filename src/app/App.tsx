import { useEffect } from 'react'

import { AppRouter } from '@/app/router'
import { useSettings } from '@/app/study/settings'

export function App() {
  const loaded = useSettings((s) => s.loaded)
  const load = useSettings((s) => s.load)
  useEffect(() => {
    void load()
  }, [load])
  if (!loaded) return null
  return <AppRouter />
}
