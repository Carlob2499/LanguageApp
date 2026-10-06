import sax from 'sax'

import type { StrokeGroup, StrokeItem } from '@/packs/ja/types'

/** Parses one KanjiVG SVG into strokes (drawing order), number positions and the component tree. */
export function parseKanjiVg(svg: string, char: string, id: string): StrokeItem {
  const parser = sax.parser(true, {})
  const strokes: Array<{ d: string; type?: string }> = []
  const numbers: Array<[number, number]> = []
  const root: StrokeGroup = { strokes: [], children: [] }
  const stack: StrokeGroup[] = []
  let inPaths = false
  let inNumbers = false
  let pendingText: [number, number] | undefined

  parser.onopentag = (tag) => {
    const a = tag.attributes as Record<string, string>
    const tagId = a['id'] ?? ''
    if (tag.name === 'g' && tagId.startsWith('kvg:StrokePaths_')) {
      inPaths = true
      return
    }
    if (tag.name === 'g' && tagId.startsWith('kvg:StrokeNumbers_')) {
      inNumbers = true
      return
    }
    if (inPaths && tag.name === 'g') {
      const group: StrokeGroup = { strokes: [], children: [] }
      if (a['kvg:element']) group.element = a['kvg:element']
      if (a['kvg:position']) group.position = a['kvg:position']
      if (a['kvg:radical']) group.radical = a['kvg:radical']
      ;(stack[stack.length - 1] ?? root).children.push(group)
      stack.push(group)
      return
    }
    if (inPaths && tag.name === 'path' && a['d']) {
      const index = strokes.length
      strokes.push(a['kvg:type'] ? { d: a['d'], type: a['kvg:type'] } : { d: a['d'] })
      for (const g of stack) g.strokes.push(index)
      root.strokes.push(index)
      return
    }
    if (inNumbers && tag.name === 'text') {
      const m = /matrix\(([^)]+)\)/.exec(a['transform'] ?? '')
      const parts = m?.[1]?.split(/[\s,]+/).map(Number) ?? []
      pendingText = [Math.round((parts[4] ?? 0) * 10) / 10, Math.round((parts[5] ?? 0) * 10) / 10]
    }
  }
  parser.onclosetag = (name) => {
    if (name === 'g' && inPaths && stack.length > 0) stack.pop()
    else if (name === 'g' && inPaths && stack.length === 0) inPaths = false
    else if (name === 'g' && inNumbers) inNumbers = false
    else if (name === 'text' && pendingText) {
      numbers.push(pendingText)
      pendingText = undefined
    }
  }
  parser.write(svg).close()
  // The outermost group is the kanji itself; its children are the components.
  const top = root.children[0]
  const groups = top && !top.element ? top.children : top ? top.children : []
  return { id, char, strokes, numbers, groups }
}

export function codepointFile(char: string): string {
  return `kanji/${char.codePointAt(0)!.toString(16).padStart(5, '0')}.svg`
}
