/**
 * KanjiVG stroke paths as point lists. The packs use only `M`, `C`/`c` and `S`/`s`, so this is a
 * small flattener rather than a full SVG path parser; everything downstream (tracing, the 3D
 * scene, tests) works on plain points and never touches the DOM.
 */

export type Point = readonly [number, number]

const TOKEN = /([MmCcSsLlZz])|(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)/g

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ]
}

/** Flattens one path's `d` attribute into points, `segments` per curve. */
export function flattenPath(d: string, segments = 12): Point[] {
  const out: Point[] = []
  const tokens = [...d.matchAll(TOKEN)]
  let i = 0
  let cmd = ''
  let cur: Point = [0, 0]
  let lastCtrl: Point | undefined
  const num = (): number => {
    const t = tokens[i++]
    if (!t?.[2]) throw new Error(`Bad path data near token ${i} in "${d}"`)
    return Number(t[2])
  }
  while (i < tokens.length) {
    const t = tokens[i]!
    if (t[1]) {
      cmd = t[1]
      i++
      if (cmd === 'Z' || cmd === 'z') continue
    }
    const rel = cmd === cmd.toLowerCase()
    const base: Point = rel ? cur : [0, 0]
    switch (cmd.toUpperCase()) {
      case 'M': {
        cur = [base[0] + num(), base[1] + num()]
        out.push(cur)
        lastCtrl = undefined
        // Subsequent pairs after M are implicit line-tos.
        cmd = rel ? 'l' : 'L'
        break
      }
      case 'L': {
        cur = [base[0] + num(), base[1] + num()]
        out.push(cur)
        lastCtrl = undefined
        break
      }
      case 'C': {
        const c1: Point = [base[0] + num(), base[1] + num()]
        const c2: Point = [base[0] + num(), base[1] + num()]
        const end: Point = [base[0] + num(), base[1] + num()]
        for (let k = 1; k <= segments; k++) out.push(cubic(cur, c1, c2, end, k / segments))
        lastCtrl = c2
        cur = end
        break
      }
      case 'S': {
        const c1: Point = lastCtrl ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur
        const c2: Point = [base[0] + num(), base[1] + num()]
        const end: Point = [base[0] + num(), base[1] + num()]
        for (let k = 1; k <= segments; k++) out.push(cubic(cur, c1, c2, end, k / segments))
        lastCtrl = c2
        cur = end
        break
      }
      default:
        throw new Error(`Unsupported path command "${cmd}" in "${d}"`)
    }
  }
  return out
}

export function pathLength(points: readonly Point[]): number {
  let len = 0
  for (let k = 1; k < points.length; k++) {
    len += Math.hypot(points[k]![0] - points[k - 1]![0], points[k]![1] - points[k - 1]![1])
  }
  return len
}

/** `n` points spaced evenly along the polyline, first and last kept. */
export function resample(points: readonly Point[], n: number): Point[] {
  if (points.length === 0) return []
  if (points.length === 1 || n === 1) return Array.from({ length: n }, () => points[0]!)
  const total = pathLength(points)
  if (total === 0) return Array.from({ length: n }, () => points[0]!)
  const out: Point[] = [points[0]!]
  const step = total / (n - 1)
  let seg = 1
  let segStart = 0
  let segLen = Math.hypot(points[1]![0] - points[0]![0], points[1]![1] - points[0]![1])
  for (let k = 1; k < n - 1; k++) {
    const target = k * step
    while (seg < points.length - 1 && segStart + segLen < target) {
      segStart += segLen
      seg++
      segLen = Math.hypot(
        points[seg]![0] - points[seg - 1]![0],
        points[seg]![1] - points[seg - 1]![1],
      )
    }
    const a = points[seg - 1]!
    const b = points[seg]!
    const t = segLen === 0 ? 0 : (target - segStart) / segLen
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  out.push(points[points.length - 1]!)
  return out
}

export function centroid(points: readonly Point[]): Point {
  if (points.length === 0) return [0, 0]
  let x = 0
  let y = 0
  for (const p of points) {
    x += p[0]
    y += p[1]
  }
  return [x / points.length, y / points.length]
}
