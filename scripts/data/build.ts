// Builds the Japanese content packs from the raw sources in data/raw.
// Output: public/packs/ja/{kanji,vocab}-N*.json, index.json, provenance.json
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  KanjiItemSchema,
  LEVELS,
  VocabItemSchema,
  type KanjiItem,
  type Level,
  type VocabItem,
} from '@/packs/ja/types'
import { ProvenanceSchema, type PackIndex, type Provenance } from '@/packs/schema'

import { parseCsv } from './lib/csv'
import { PACKS_DIR, RAW_DIR, readJson, writeJson } from './lib/fs'
import { child, children, streamRecords, text, type Element } from './lib/xml'
import { SOURCES } from './sources'

const generated = new Date().toISOString()
const PROVENANCE_PATH = 'provenance.json'

interface FetchLog {
  fetchedAt: string
  records: Array<{
    id: string
    url: string
    file: string
    bytes: number
    sha256: string
    lastModified: string | null
    downloadedAt: string
  }>
}
const fetchLog = readJson<FetchLog>(join(RAW_DIR, 'fetch-log.json'))
const fetched = new Map(fetchLog.records.map((r) => [r.id, r]))
for (const source of SOURCES) {
  if (!fetched.has(source.id))
    throw new Error(`Source ${source.id} has not been fetched. Run "npm run data:fetch".`)
}

// 1. JLPT vocabulary levels (Waller lists aligned to JMdict seq). First level wins (N5 before N1).
const vocabLevel = new Map<number, Level>()
for (const level of LEVELS) {
  const rows = parseCsv(
    readFileSync(join(RAW_DIR, `jlpt-vocab-${level.toLowerCase()}.csv`), 'utf8'),
  )
  const header = rows[0] ?? []
  const seqCol = header.indexOf('jmdict_seq')
  if (seqCol < 0) throw new Error(`jlpt-vocab-${level}: no jmdict_seq column`)
  for (const row of rows.slice(1)) {
    const seq = Number.parseInt(row[seqCol] ?? '', 10)
    if (Number.isFinite(seq) && !vocabLevel.has(seq)) vocabLevel.set(seq, level)
  }
}

// 2. JLPT kanji levels: only the jlpt_new field of kanji-data is read; every other field is ignored.
const kanjiLevel = new Map<string, Level>()
{
  const raw = readJson<Record<string, { jlpt_new?: number | null }>>(
    join(RAW_DIR, 'kanji-data.json'),
  )
  for (const [char, entry] of Object.entries(raw)) {
    const n = entry.jlpt_new
    if (typeof n === 'number' && n >= 1 && n <= 5) kanjiLevel.set(char, `N${n}` as Level)
  }
}

// 3. KANJIDIC2 → kanji items. SKIP codes (query_code qc_type="skip") are never read.
const kanji: KanjiItem[] = []
let kanjidicCount = 0
await streamRecords(
  join(RAW_DIR, 'kanjidic2.xml.gz'),
  'character',
  (el) => {
    kanjidicCount++
    const literal = text(child(el, 'literal'))
    const level = kanjiLevel.get(literal)
    if (!level) return
    const misc = child(el, 'misc')
    const rm = child(el, 'reading_meaning')
    const groups = rm ? children(rm, 'rmgroup') : []
    const readings = groups.flatMap((g) => children(g, 'reading'))
    const meanings = groups
      .flatMap((g) => children(g, 'meaning'))
      .filter((m) => !m.attrs['m_lang'])
      .map(text)
    const radical = child(el, 'radical')
    const classical = radical
      ? children(radical, 'rad_value').find((r) => r.attrs['rad_type'] === 'classical')
      : undefined
    const grade = text(child(misc as Element, 'grade'))
    const freq = text(child(misc as Element, 'freq'))
    kanji.push({
      id: `k:${literal}`,
      char: literal,
      level,
      on: readings.filter((r) => r.attrs['r_type'] === 'ja_on').map(text),
      kun: readings.filter((r) => r.attrs['r_type'] === 'ja_kun').map(text),
      meanings,
      strokes: Number.parseInt(text(children(misc as Element, 'stroke_count')[0]), 10),
      grade: grade ? Number.parseInt(grade, 10) : null,
      radical: Number.parseInt(text(classical), 10),
      freq: freq ? Number.parseInt(freq, 10) : null,
    })
  },
  { gzip: true },
)

// 4. JMdict → vocab items for the listed entries.
const KANJI_RE = /[㐀-䶿一-鿿豈-﫿]/gu
const TOP_PRI = new Set(['news1', 'ichi1', 'spec1', 'gai1'])
const vocab: VocabItem[] = []
let jmdictCount = 0
let exampleCount = 0
await streamRecords(
  join(RAW_DIR, 'JMdict_e_examp.gz'),
  'entry',
  (el) => {
    jmdictCount++
    const seq = Number.parseInt(text(child(el, 'ent_seq')), 10)
    const level = vocabLevel.get(seq)
    if (!level) return
    const pris: string[] = []
    const forms = children(el, 'k_ele').map((k) => {
      const p = children(k, 'ke_pri').map(text)
      pris.push(...p)
      return { text: text(child(k, 'keb')), common: p.length > 0 }
    })
    const readings = children(el, 'r_ele').map((r) => {
      const p = children(r, 're_pri').map(text)
      pris.push(...p)
      const restrict = children(r, 're_restr').map(text)
      return {
        text: text(child(r, 'reb')),
        common: p.length > 0,
        ...(restrict.length > 0 ? { restrictTo: restrict } : {}),
      }
    })
    const senses = children(el, 'sense')
      .map((s) => ({
        gloss: children(s, 'gloss')
          .filter((g) => !g.attrs['xml:lang'] || g.attrs['xml:lang'] === 'eng')
          .map(text),
        pos: children(s, 'pos').map(text),
        misc: children(s, 'misc').map(text),
      }))
      .filter((s) => s.gloss.length > 0)
    exampleCount += children(el, 'sense').reduce((n, s) => n + children(s, 'example').length, 0)
    const kanjiChars = [...new Set(forms.flatMap((f) => f.text.match(KANJI_RE) ?? []))]
    const priority = pris.some((p) => TOP_PRI.has(p)) ? 2 : pris.length > 0 ? 1 : 0
    vocab.push({ id: `v:${seq}`, seq, level, forms, readings, senses, kanji: kanjiChars, priority })
  },
  { gzip: true },
)

// 5. Validate everything before writing anything.
const problems: string[] = []
for (const item of kanji) {
  const r = KanjiItemSchema.safeParse(item)
  if (!r.success)
    problems.push(
      `kanji ${item.char}: ${r.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
    )
}
for (const item of vocab) {
  const r = VocabItemSchema.safeParse(item)
  if (!r.success)
    problems.push(
      `vocab ${item.seq}: ${r.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
    )
}
if (problems.length > 0) {
  console.error(problems.slice(0, 20).join('\n'))
  throw new Error(`${problems.length} items failed schema validation`)
}

// 6. Write packs per level, then the index and provenance manifest.
const files: Provenance['files'] = []
const index: PackIndex = {
  language: 'ja',
  generated,
  levels: [...LEVELS],
  files: { kanji: {}, vocab: {} },
  counts: { kanji: {}, vocab: {} },
}
const sortKanji = (a: KanjiItem, b: KanjiItem) =>
  (a.freq ?? 9999) - (b.freq ?? 9999) || a.strokes - b.strokes
const sortVocab = (a: VocabItem, b: VocabItem) => b.priority - a.priority || a.seq - b.seq

for (const level of LEVELS) {
  const k = kanji.filter((x) => x.level === level).sort(sortKanji)
  const v = vocab.filter((x) => x.level === level).sort(sortVocab)
  const kPath = `kanji-${level}.json`
  const vPath = `vocab-${level}.json`
  const kw = writeJson(join(PACKS_DIR, kPath), {
    meta: { language: 'ja', kind: 'kanji', level, generated, provenance: PROVENANCE_PATH },
    items: k,
  })
  const vw = writeJson(join(PACKS_DIR, vPath), {
    meta: { language: 'ja', kind: 'vocab', level, generated, provenance: PROVENANCE_PATH },
    items: v,
  })
  files.push({
    path: kPath,
    kind: 'kanji',
    level,
    records: k.length,
    ...kw,
    sources: ['kanjidic2', 'jlpt-kanji'],
    transform:
      'KANJIDIC2 characters whose literal appears in the unofficial JLPT kanji list for this level. Fields: on/kun readings, English meanings, stroke count, grade, classical radical, newspaper frequency. SKIP codes and all other query codes dropped. Sorted by frequency then strokes.',
  })
  files.push({
    path: vPath,
    kind: 'vocab',
    level,
    records: v.length,
    ...vw,
    sources: ['jmdict', `jlpt-vocab-${level.toLowerCase()}`],
    transform:
      'JMdict entries whose ent_seq appears in the unofficial JLPT vocabulary list for this level (a word listed at several levels keeps the easiest). Fields: kanji forms with priority flag, readings with restrictions, English glosses with POS and misc tags, distinct kanji characters, priority tier from JMdict markers. Sorted by priority then entry id.',
  })
  index.files['kanji']![level] = kPath
  index.files['vocab']![level] = vPath
  index.counts['kanji']![level] = k.length
  index.counts['vocab']![level] = v.length
}
const iw = writeJson(join(PACKS_DIR, 'index.json'), index)
files.push({
  path: 'index.json',
  kind: 'index',
  records: files.length,
  ...iw,
  sources: [],
  transform: 'Index of pack files and record counts.',
})

const provenance: Provenance = {
  generated,
  sources: SOURCES.map((s) => {
    const f = fetched.get(s.id)!
    return {
      id: s.id,
      name: s.name,
      url: s.url,
      homepage: s.homepage,
      licence: s.licence,
      attribution: s.attribution,
      file: s.file,
      sha256: f.sha256,
      bytes: f.bytes,
      downloadedAt: f.downloadedAt,
      lastModified: f.lastModified,
    }
  }),
  files,
}
ProvenanceSchema.parse(provenance)
writeJson(join(PACKS_DIR, PROVENANCE_PATH), provenance)

// 7. Report.
const missingVocab = [...vocabLevel.keys()].filter((seq) => !vocab.some((v) => v.seq === seq))
const missingKanji = [...kanjiLevel.keys()].filter((c) => !kanji.some((k) => k.char === c))
console.log(
  `KANJIDIC2 characters read: ${kanjidicCount}; JMdict entries read: ${jmdictCount}; example sentences seen on kept entries: ${exampleCount}`,
)
for (const level of LEVELS)
  console.log(
    `${level}: ${index.counts['kanji']![level]} kanji, ${index.counts['vocab']![level]} words`,
  )
console.log(
  `Listed words not found in JMdict: ${missingVocab.length}${missingVocab.length ? ' (' + missingVocab.slice(0, 10).join(', ') + ')' : ''}`,
)
console.log(
  `Listed kanji not found in KANJIDIC2: ${missingKanji.length}${missingKanji.length ? ' (' + missingKanji.slice(0, 10).join('') + ')' : ''}`,
)
console.log(`Wrote ${files.length} files to ${PACKS_DIR}.`)
