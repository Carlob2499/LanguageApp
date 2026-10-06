import { lazy, Suspense, useEffect, useMemo, useState } from 'react'

import { Button } from '@/app/components/Button'
import type { StrokeItem } from '@/packs/ja/types'

import { AssemblyFallback } from './AssemblyFallback'
import styles from './AssemblyStage.module.css'
import { buildPieces } from './pieces'
import { canRender3D } from './support'

const Assembly = lazy(() => import('./Assembly'))

export interface AssemblyStageProps {
  item: StrokeItem
  highlighted: number | undefined
  onSelect: (index: number | undefined) => void
}

/**
 * Hosts the component scene. The 3D view loads lazily and only where it can run well; the flat
 * diagram is always one tap away and is the default under reduced motion.
 */
export function AssemblyStage({ item, highlighted, onSelect }: AssemblyStageProps) {
  const pieces = useMemo(() => buildPieces(item), [item])
  const [supports3D, setSupports3D] = useState<boolean>()
  const [flat, setFlat] = useState(false)
  const [exploded, setExploded] = useState(true)
  useEffect(() => {
    const id = window.setTimeout(() => setSupports3D(canRender3D()), 0)
    return () => window.clearTimeout(id)
  }, [])
  useEffect(() => {
    // Pieces start apart and assemble on their own a moment after the scene appears.
    if (!supports3D || flat) return
    const id = window.setTimeout(() => setExploded(false), 900)
    return () => window.clearTimeout(id)
  }, [supports3D, flat])

  const selected = pieces.find((p) => p.index === highlighted)
  const show3D = supports3D === true && !flat

  return (
    <div className={styles.stage} data-mode={show3D ? '3d' : 'flat'}>
      {show3D ? (
        <div className={styles.scene} data-testid="assembly-3d">
          <Suspense fallback={<p className={styles.loading}>Shaping the pieces…</p>}>
            <Assembly
              pieces={pieces}
              highlighted={highlighted}
              onSelect={onSelect}
              exploded={exploded}
              onExplodedChange={setExploded}
            />
          </Suspense>
          <p className={styles.caption} aria-hidden="true">
            {selected
              ? `${selected.element ?? 'Loose strokes'}${selected.position ? ` · ${selected.position}` : ''}`
              : 'Drag sideways to take it apart. Tap a piece to name it.'}
          </p>
        </div>
      ) : (
        <div data-testid="assembly-flat">
          <AssemblyFallback
            item={item}
            pieces={pieces}
            highlighted={highlighted}
            onSelect={onSelect}
          />
        </div>
      )}
      <div className={styles.tools}>
        {show3D && (
          <Button variant="quiet" onClick={() => setExploded((v) => !v)}>
            {exploded ? 'Assemble' : 'Take apart'}
          </Button>
        )}
        {supports3D && (
          <Button variant="quiet" aria-pressed={flat} onClick={() => setFlat((v) => !v)}>
            Flat view
          </Button>
        )}
      </div>
    </div>
  )
}
