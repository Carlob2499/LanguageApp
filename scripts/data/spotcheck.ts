// Spot-checks 50 random pack entries against the raw source files and appends the result to PROGRESS.md.
import { appendFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { KanjiItem, SentenceItem, VocabItem } from '@/packs/ja/types'

import { PACKS_DIR, RAW_DIR, readJson } from './lib/fs'
import { child, children, streamRecords, text } from './lib/xml'

const seedArg = process.argv.find((a) => a.startsWith('--seed='))
let seed = seedArg ? Number.parseInt(seedArg.slice(7), 10) : Date.now() % 100000
const rand = () => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647
}
const pick = <T>(list: T[], n: number): T[] => {
  const copy = [...list]
  const out: T[] = []
  while (out.length < n && copy.length > 0)
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]!)
  return out
}

interface Pack<T> {
  items: T[]
}
const levels = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
const kanji = levels.flatMap(
  (l) => readJson<Pack<KanjiItem>>(join(PACKS_DIR, `kanji-${l}.json`)).items,
)
const vocab = levels.flatMap(
  (l) => readJson<Pack<VocabItem>>(join(PACKS_DIR, `vocab-${l}.json`)).items,
)
const sentences = levels.flatMap(
  (l) => readJson<Pack<SentenceItem>>(join(PACKS_DIR, `sentences-${l}.json`)).items,
)

const kanjiSample = pick(kanji, 20)
const vocabSample = pick(vocab, 20)
const sentenceSample = pick(sentences, 10)
const wantKanji = new Set(kanjiSample.map((k) => k.char))
const wantSeq = new Set(vocabSample.map((v) => v.seq))
const wantTat = new Set(sentenceSample.map((s) => s.tatoebaId))

// One pass over each raw file, collecting only the sampled records.
const rawKanji = new Map<
  string,
  { on: string[]; kun: string[]; meanings: string[]; strokes: number }
>()
await streamRecords(
  join(RAW_DIR, 'kanjidic2.xml.gz'),
  'character',
  (el) => {
    const literal = text(child(el, 'literal'))
    if (!wantKanji.has(literal)) return
    const rm = child(el, 'reading_meaning')
    const groups = rm ? children(rm, 'rmgroup') : []
    const readings = groups.flatMap((g) => children(g, 'reading'))
    rawKanji.set(literal, {
      on: readings.filter((r) => r.attrs['r_type'] === 'ja_on').map(text),
      kun: readings.filter((r) => r.attrs['r_type'] === 'ja_kun').map(text),
      meanings: groups
        .flatMap((g) => children(g, 'meaning'))
        .filter((m) => !m.attrs['m_lang'])
        .map(text),
      strokes: Number.parseInt(text(children(child(el, 'misc')!, 'stroke_count')[0]), 10),
    })
  },
  { gzip: true },
)
const rawVocab = new Map<number, { forms: string[]; readings: string[]; gloss: string[] }>()
const rawSentence = new Map<number, { jp: string; en: string }>()
await streamRecords(
  join(RAW_DIR, 'JMdict_e_examp.gz'),
  'entry',
  (el) => {
    const seq = Number.parseInt(text(child(el, 'ent_seq')), 10)
    const senses = children(el, 'sense')
    for (const s of senses) {
      for (const ex of children(s, 'example')) {
        const id = Number.parseInt(text(child(ex, 'ex_srce')), 10)
        if (wantTat.has(id)) {
          const sent = children(ex, 'ex_sent')
          rawSentence.set(id, {
            jp: text(sent.find((x) => x.attrs['xml:lang'] === 'jpn')),
            en: text(sent.find((x) => x.attrs['xml:lang'] === 'eng')),
          })
        }
      }
    }
    if (!wantSeq.has(seq)) return
    rawVocab.set(seq, {
      forms: children(el, 'k_ele').map((k) => text(child(k, 'keb'))),
      readings: children(el, 'r_ele').map((r) => text(child(r, 'reb'))),
      gloss: children(senses[0]!, 'gloss').map(text),
    })
  },
  { gzip: true },
)

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])
let pass = 0
const lines: string[] = []
for (const k of kanjiSample) {
  const raw = rawKanji.get(k.char)
  const ok = Boolean(
    raw &&
    same(raw.on, k.on) &&
    same(raw.kun, k.kun) &&
    same(raw.meanings, k.meanings) &&
    raw.strokes === k.strokes,
  )
  if (ok) pass++
  lines.push(
    `${ok ? 'ok  ' : 'DIFF'} kanji ${k.char} (${k.level}) on=${k.on.join('/')} kun=${k.kun.slice(0, 3).join('/')} meanings=${k.meanings.slice(0, 2).join('; ')} strokes=${k.strokes}${ok ? '' : ' | raw: ' + JSON.stringify(raw)}`,
  )
}
for (const v of vocabSample) {
  const raw = rawVocab.get(v.seq)
  const ok = Boolean(
    raw &&
    same(
      raw.forms,
      v.forms.map((f) => f.text),
    ) &&
    same(
      raw.readings,
      v.readings.map((r) => r.text),
    ) &&
    same(raw.gloss, v.senses[0]!.gloss),
  )
  if (ok) pass++
  lines.push(
    `${ok ? 'ok  ' : 'DIFF'} vocab ${v.seq} (${v.level}) ${v.forms[0]?.text ?? ''} ${v.readings[0]!.text} = ${v.senses[0]!.gloss.slice(0, 2).join('; ')}${ok ? '' : ' | raw: ' + JSON.stringify(raw)}`,
  )
}
for (const s of sentenceSample) {
  const raw = rawSentence.get(s.tatoebaId)
  const ok = Boolean(raw && raw.jp === s.jp && raw.en === s.en)
  if (ok) pass++
  lines.push(
    `${ok ? 'ok  ' : 'DIFF'} sentence ${s.tatoebaId} ${s.jp.slice(0, 24)}… / ${s.en.slice(0, 32)}…${ok ? '' : ' | raw: ' + JSON.stringify(raw)}`,
  )
}

const total = kanjiSample.length + vocabSample.length + sentenceSample.length
console.log(lines.join('\n'))
console.log(
  `\nSpot-check: ${pass}/${total} entries match their source records (seed ${seedArg ?? 'time-based'}).`,
)
const date = new Date().toISOString().slice(0, 10)
const entry =
  `\n### ${date} — ${pass}/${total} matched (20 kanji vs KANJIDIC2, 20 words vs JMdict, 10 sentences vs JMdict examples)\n` +
  lines.map((l) => `- ${l}`).join('\n') +
  '\n'
const progress = readFileSync('PROGRESS.md', 'utf8')
if (progress.includes('## Spot-checks')) appendFileSync('PROGRESS.md', entry)
if (pass !== total) process.exitCode = 1
