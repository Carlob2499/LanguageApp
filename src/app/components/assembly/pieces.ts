import { centroid, flattenPath, type Point } from '@/engine/stroke-path'
import type { StrokeItem } from '@/packs/ja/types'

/** One lacquered piece of the exploded kanji: a KanjiVG component group, or the loose strokes. */
export interface Piece {
  /** Index into `item.groups`; `groups.length` for strokes outside every group. */
  index: number
  element?: string
  position?: string
  radical?: boolean
  strokeIndices: number[]
  /** Flattened strokes in world units (glyph centred, 10 KanjiVG units per world unit, y up). */
  strokes: Point[][]
  /** Flattened strokes in KanjiVG box units, for the flat diagram. */
  box: Point[][]
  /** Where the piece floats when the kanji is exploded. */
  explode: readonly [number, number, number]
  /** Small tilt while exploded, radians. */
  tilt: readonly [number, number]
}

export const BOX = 109
const SCALE = 10

export function toWorld([x, y]: Point): Point {
  return [(x - BOX / 2) / SCALE, (BOX / 2 - y) / SCALE]
}

function seeded(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Splits a character into pieces by its top-level KanjiVG groups. Each piece explodes away from
 * the glyph centre along the line through its own centroid, with depth spread so pieces never
 * overlap in the exploded view.
 */
export function buildPieces(item: StrokeItem): Piece[] {
  const flat = item.strokes.map((s) => flattenPath(s.d, 10))
  const assigned = new Set<number>()
  const raw: Array<Omit<Piece, 'explode' | 'tilt'>> = []
  item.groups.forEach((g, index) => {
    const strokeIndices = g.strokes.filter((i) => i < flat.length && !assigned.has(i))
    if (strokeIndices.length === 0) return
    strokeIndices.forEach((i) => assigned.add(i))
    raw.push({
      index,
      ...(g.element ? { element: g.element } : {}),
      ...(g.position ? { position: g.position } : {}),
      ...(g.radical ? { radical: true } : {}),
      strokeIndices,
      box: strokeIndices.map((i) => flat[i]!),
      strokes: strokeIndices.map((i) => flat[i]!.map(toWorld)),
    })
  })
  const loose = flat.map((_, i) => i).filter((i) => !assigned.has(i))
  if (loose.length > 0) {
    raw.push({
      index: item.groups.length,
      strokeIndices: loose,
      box: loose.map((i) => flat[i]!),
      strokes: loose.map((i) => flat[i]!.map(toWorld)),
    })
  }
  const n = raw.length
  return raw.map((piece, k) => {
    const [cx, cy] = centroid(piece.strokes.flat())
    const len = Math.hypot(cx, cy)
    const angle = len < 0.4 ? seeded(k) * Math.PI * 2 : Math.atan2(cy, cx)
    const reach = n === 1 ? 0 : 2.3 + seeded(k + 11) * 0.6
    const depth = n === 1 ? 0 : (k - (n - 1) / 2) * 1.6
    return {
      ...piece,
      explode: [Math.cos(angle) * reach, Math.sin(angle) * reach, depth],
      tilt: [(seeded(k + 3) - 0.5) * 0.7, (seeded(k + 5) - 0.5) * 0.9],
    }
  })
}
