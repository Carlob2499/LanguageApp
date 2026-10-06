import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { flattenPath, type Point } from '@/engine/stroke-path'
import {
  HINT_AFTER_MISSES,
  INITIAL_TRACING,
  matchStroke,
  REASON_COPY,
  tracingReducer,
  type TracingState,
} from '@/engine/tracing'
import type { StrokeItem } from '@/packs/ja/types'

import { Button } from './Button'
import { GoldFlecks } from './GoldFlecks'
import styles from './Trace.module.css'

const BOX = 109

function toPath(points: readonly Point[]): string {
  if (points.length === 0) return ''
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
}

export interface TraceProps {
  item: StrokeItem
  /** Called once when every stroke has been traced. */
  onComplete?: ((state: TracingState) => void) | undefined
}

/**
 * Finger (or mouse) tracing over the character's strokes. Each stroke is matched against its
 * KanjiVG path with the forgiving matcher; a hit snaps to gold, a miss fades in red and, after
 * two misses, the stroke draws itself as a hint. "From memory" hides the guide.
 */
export function Trace({ item, onComplete }: TraceProps) {
  const targets = useMemo(() => item.strokes.map((s) => flattenPath(s.d, 12)), [item])
  const count = targets.length
  const [state, setState] = useState<TracingState>(INITIAL_TRACING)
  const [fromMemory, setFromMemory] = useState(false)
  const [hint, setHint] = useState<{ stroke: number; key: number }>()
  const [live, setLive] = useState<Point[]>([])
  const [miss, setMiss] = useState<{ points: Point[]; key: number }>()
  const drawing = useRef<Point[]>([])
  const svgRef = useRef<SVGSVGElement>(null)
  const completed = useRef(false)

  const done = state.index >= count

  useEffect(() => {
    if (done && !completed.current) {
      completed.current = true
      onComplete?.(state)
    }
    if (!done) completed.current = false
  }, [done, onComplete, state])

  function point(e: ReactPointerEvent<SVGSVGElement>): Point {
    const rect = svgRef.current!.getBoundingClientRect()
    return [
      ((e.clientX - rect.left) / rect.width) * BOX,
      ((e.clientY - rect.top) / rect.height) * BOX,
    ]
  }

  function onDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (done || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = [point(e)]
    setLive(drawing.current)
  }

  function onMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (drawing.current.length === 0 || !e.currentTarget.hasPointerCapture(e.pointerId)) return
    const p = point(e)
    const last = drawing.current[drawing.current.length - 1]!
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.8) return
    drawing.current = [...drawing.current, p]
    setLive(drawing.current)
  }

  function onUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (drawing.current.length === 0) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    const drawn = drawing.current
    drawing.current = []
    setLive([])
    const target = targets[state.index]
    if (!target) return
    const result = matchStroke(drawn, target)
    const next = tracingReducer(state, { type: 'result', result }, count)
    setState(next)
    if (!result.ok) {
      setMiss({ points: drawn, key: next.attempts })
      if (next.misses >= HINT_AFTER_MISSES) setHint({ stroke: state.index, key: next.attempts })
    }
  }

  function showHint() {
    if (done) return
    setHint({ stroke: state.index, key: (hint?.key ?? 0) + 1 })
  }

  function reset() {
    setState(INITIAL_TRACING)
    setHint(undefined)
    setMiss(undefined)
  }

  const status = done
    ? state.attempts === count
      ? `All ${count} strokes, first try.`
      : `All ${count} strokes traced in ${state.attempts} tries.`
    : state.lastReason
      ? REASON_COPY[state.lastReason]
      : `Stroke ${state.index + 1} of ${count}`

  const current = targets[state.index]

  return (
    <div className={styles.trace} data-done={done ? 'true' : undefined}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOX} ${BOX}`}
        className={styles.surface}
        role="img"
        aria-label={`Tracing surface for ${item.char}. Draw each stroke in order with a finger or the mouse.`}
        data-testid="trace-surface"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* Guide: every stroke faint, the current one brighter, unless tracing from memory. */}
        {!fromMemory &&
          item.strokes.map((s, i) =>
            i >= state.index ? (
              <path
                key={`g${i}`}
                d={s.d}
                className={i === state.index ? styles.guideCurrent : styles.guide}
              />
            ) : null,
          )}
        {/* Strokes already traced, in gold. */}
        {item.strokes.map((s, i) =>
          i < state.index ? (
            <path
              key={`d${i}`}
              d={s.d}
              className={state.skipped.includes(i) ? styles.skippedStroke : styles.doneStroke}
            />
          ) : null,
        )}
        {hint && hint.stroke === state.index && !done && (
          <path
            key={`h${hint.key}`}
            d={item.strokes[hint.stroke]!.d}
            pathLength={1}
            className={styles.hint}
          />
        )}
        {current && !done && (!fromMemory || state.misses > 0) && (
          <circle
            cx={current[0]![0]}
            cy={current[0]![1]}
            r={4}
            className={styles.startDot}
            key={`s${state.index}`}
          />
        )}
        {miss && <path key={`m${miss.key}`} d={toPath(miss.points)} className={styles.miss} />}
        {live.length > 0 && <path d={toPath(live)} className={styles.live} />}
      </svg>
      <p className={styles.status} role="status" aria-live="polite">
        {status}
      </p>
      <div className={styles.tools}>
        {done ? (
          <Button onClick={reset}>Trace again</Button>
        ) : (
          <>
            <Button variant="quiet" onClick={showHint}>
              Show me
            </Button>
            <Button
              variant="quiet"
              onClick={() => setState((s) => tracingReducer(s, { type: 'skip' }, count))}
            >
              Skip stroke
            </Button>
          </>
        )}
        <Button
          variant="quiet"
          aria-pressed={fromMemory}
          onClick={() => setFromMemory((v) => !v)}
          className={styles.memoryToggle}
        >
          From memory
        </Button>
      </div>
      {done && <GoldFlecks count={40} />}
    </div>
  )
}
