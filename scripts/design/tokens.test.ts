// @vitest-environment node
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/engine/color'

const css = readFileSync('src/app/styles/tokens.css', 'utf8')

function token(name: string): string {
  const match = new RegExp(`--k-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)
  if (!match?.[1]) throw new Error(`token --k-${name} not found`)
  return match[1]
}

// Every text/background pair the UI uses, with the minimum ratio it must meet.
const pairs: Array<[text: string, bg: string, min: number]> = [
  ['bone', 'lacquer', 4.5],
  ['bone-muted', 'lacquer', 4.5],
  ['bone-faint', 'lacquer', 4.5],
  ['bone', 'lacquer-raised', 4.5],
  ['bone-muted', 'lacquer-raised', 4.5],
  ['gold', 'lacquer', 4.5],
  ['gold-dim', 'lacquer', 4.5],
  ['celadon', 'lacquer', 4.5],
  ['shu-text', 'lacquer', 4.5],
  ['lacquer', 'gold', 4.5],
  ['lacquer', 'celadon', 4.5],
  ['lacquer', 'shu', 4.5],
  ['bone', 'bengara', 4.5],
  ['ink', 'paper', 4.5],
  ['ink-muted', 'paper', 4.5],
  ['ink-faint', 'paper', 4.5],
  ['ink', 'paper-raised', 4.5],
  ['bengara', 'paper', 4.5],
  ['shu-ink', 'paper', 4.5],
  ['celadon-ink', 'paper', 4.5],
  ['paper', 'shu-ink', 4.5],
  ['paper', 'celadon-ink', 4.5],
  ['ink', 'gold', 4.5],
]

describe('design tokens', () => {
  it.each(pairs)('%s on %s meets %s:1', (text, bg, min) => {
    expect(contrastRatio(token(text), token(bg))).toBeGreaterThanOrEqual(min)
  })
})
