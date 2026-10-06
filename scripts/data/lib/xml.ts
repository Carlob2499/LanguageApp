import { createReadStream } from 'node:fs'
import { createGunzip } from 'node:zlib'

import sax from 'sax'

export interface Element {
  name: string
  attrs: Record<string, string>
  text: string
  children: Element[]
}

/**
 * Streams a (gzipped) XML file and calls `onRecord` with a fully built subtree for every
 * element named `recordName`. Internal DTD entities (JMdict declares its POS tags that way)
 * are registered so the parser expands them to their text.
 */
export function streamRecords(
  path: string,
  recordName: string,
  onRecord: (record: Element) => void,
  options: { gzip?: boolean } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const parser = sax.createStream(true, { trim: false })
    const stack: Element[] = []
    let depth = 0
    let capturing = false

    parser.on('doctype', (doctype: string) => {
      for (const match of doctype.matchAll(/<!ENTITY\s+(\S+)\s+"([^"]*)"\s*>/g)) {
        const [, name, value] = match
        if (name && value !== undefined) parser._parser.ENTITIES[name] = value
      }
    })
    parser.on('opentag', (tag: sax.Tag | sax.QualifiedTag) => {
      depth++
      if (!capturing && tag.name === recordName) capturing = true
      if (!capturing) return
      const attrs: Record<string, string> = {}
      const raw = tag.attributes as Record<string, string | { value: string }>
      for (const [k, v] of Object.entries(raw)) attrs[k] = typeof v === 'string' ? v : v.value
      const el: Element = { name: tag.name, attrs, text: '', children: [] }
      stack[stack.length - 1]?.children.push(el)
      stack.push(el)
    })
    parser.on('text', (text: string) => {
      if (!capturing) return
      const top = stack[stack.length - 1]
      if (top) top.text += text
    })
    parser.on('closetag', (name: string) => {
      depth--
      if (!capturing) return
      const el = stack.pop()
      if (el && name === recordName && stack.length === 0) {
        capturing = false
        onRecord(el)
      }
    })
    parser.on('error', (error: Error) => reject(error))
    parser.on('end', () => resolve())

    const file = createReadStream(path)
    const stream = options.gzip ? file.pipe(createGunzip()) : file
    stream.on('error', reject)
    stream.pipe(parser)
    void depth
  })
}

export function child(el: Element, name: string): Element | undefined {
  return el.children.find((c) => c.name === name)
}
export function children(el: Element, name: string): Element[] {
  return el.children.filter((c) => c.name === name)
}
export function text(el: Element | undefined): string {
  return (el?.text ?? '').trim()
}
