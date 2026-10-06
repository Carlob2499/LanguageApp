// Builds the Japanese content packs from the raw sources in data/raw.
// Output: public/packs/ja/{kanji,vocab,strokes,sentences}-N*.json, strokes-kana.json, index.json, provenance.json; public/audio/*.mp3
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { unzipSync } from 'fflate'

import {
  KanjiItemSchema,
  LEVELS,
  KanaItemSchema,
  SentenceItemSchema,
  StrokeItemSchema,
  VocabItemSchema,
  type KanjiItem,
  type Level,
  type SentenceItem,
  type StrokeItem,
  type VocabItem,
} from '@/packs/ja/types'
import { ProvenanceSchema, type PackIndex, type Provenance } from '@/packs/schema'

import { readBz2Text } from './lib/bz2'
import { parseCsv } from './lib/csv'
import { PACKS_DIR, RAW_DIR, readJson, writeJson } from './lib/fs'
import { download } from './lib/http'
import { codepointFile, parseKanjiVg } from './lib/kanjivg'
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

// 3a. KRADFILE / KRADFILE2 (EUC-JP) → visual components per kanji.
const components = new Map<string, string[]>()
{
  const zip = unzipSync(new Uint8Array(readFileSync(join(RAW_DIR, 'kradzip.zip'))))
  const decoder = new TextDecoder('euc-jp')
  for (const name of ['kradfile', 'kradfile2']) {
    const data = zip[name]
    if (!data) throw new Error(`kradzip.zip has no ${name}`)
    for (const line of decoder.decode(data).split('\n')) {
      if (line.startsWith('#') || !line.includes(':')) continue
      const [left, right] = line.split(':')
      const char = left?.trim()
      if (char && right) components.set(char, right.trim().split(/\s+/).filter(Boolean))
    }
  }
}

// 3b. KANJIDIC2 → kanji items. SKIP codes (query_code qc_type="skip") are never read.
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
      components: components.get(literal) ?? [],
    })
  },
  { gzip: true },
)

// 4. JMdict → vocab items for the listed entries.
const KANJI_RE = /[㐀-䶿一-鿿豈-﫿]/gu
const TOP_PRI = new Set(['news1', 'ichi1', 'spec1', 'gai1'])
const vocab: VocabItem[] = []
interface RawExample {
  tatoebaId: number
  form: string
  jp: string
  en: string
  word: string
}
const examples: RawExample[] = []
/** Every reading in JMdict, so placement-test pseudowords can be verified as non-words. */
const allReadings = new Set<string>()
let jmdictCount = 0
let exampleCount = 0
await streamRecords(
  join(RAW_DIR, 'JMdict_e_examp.gz'),
  'entry',
  (el) => {
    jmdictCount++
    for (const r of children(el, 'r_ele')) allReadings.add(text(child(r, 'reb')))
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
    for (const sense of children(el, 'sense')) {
      for (const ex of children(sense, 'example')) {
        const srce = child(ex, 'ex_srce')
        if (srce?.attrs['exsrc_type'] !== 'tat') continue
        const sentences = children(ex, 'ex_sent')
        const jp = text(sentences.find((x) => x.attrs['xml:lang'] === 'jpn'))
        const en = text(sentences.find((x) => x.attrs['xml:lang'] === 'eng'))
        const tatoebaId = Number.parseInt(text(srce), 10)
        if (!jp || !en || !Number.isFinite(tatoebaId)) continue
        examples.push({ tatoebaId, form: text(child(ex, 'ex_text')), jp, en, word: `v:${seq}` })
        exampleCount++
      }
    }
    const kanjiChars = [...new Set(forms.flatMap((f) => f.text.match(KANJI_RE) ?? []))]
    const priority = pris.some((p) => TOP_PRI.has(p)) ? 2 : pris.length > 0 ? 1 : 0
    vocab.push({ id: `v:${seq}`, seq, level, forms, readings, senses, kanji: kanjiChars, priority })
  },
  { gzip: true },
)

// 4b. KanjiVG → stroke packs for every level kanji, plus kana for the beginner module.
const kvg = unzipSync(new Uint8Array(readFileSync(join(RAW_DIR, 'kanjivg.zip'))))
const kvgText = new TextDecoder()
function strokesFor(char: string, id: string): StrokeItem | undefined {
  const file = kvg[codepointFile(char)]
  return file ? parseKanjiVg(kvgText.decode(file), char, id) : undefined
}
const strokes: StrokeItem[] = []
const missingStrokes: string[] = []
for (const k of kanji) {
  const item = strokesFor(k.char, k.id)
  if (item) strokes.push(item)
  else missingStrokes.push(k.char)
}
const kanaStrokes: StrokeItem[] = []
for (let cp = 0x3041; cp <= 0x3096; cp++) {
  const item = strokesFor(String.fromCodePoint(cp), `kana:${String.fromCodePoint(cp)}`)
  if (item) kanaStrokes.push(item)
}
for (let cp = 0x30a1; cp <= 0x30fa; cp++) {
  const item = strokesFor(String.fromCodePoint(cp), `kana:${String.fromCodePoint(cp)}`)
  if (item) kanaStrokes.push(item)
}

// 4c. Tatoeba: contributor per Japanese sentence, licensed audio per sentence.
const contributor = new Map<number, string>()
for (const line of (await readBz2Text(join(RAW_DIR, 'jpn_sentences_detailed.tsv.bz2'))).split(
  '\n',
)) {
  const [id, , , user] = line.split('\t')
  if (id && user && user !== '\\N') contributor.set(Number.parseInt(id, 10), user)
}
const ALLOWED_AUDIO = new Set(['CC BY 4.0', 'CC BY-NC 4.0', 'CC BY-SA 4.0', 'CC0 1.0'])
const audioBySentence = new Map<number, { id: number; speaker: string; licence: string }>()
for (const line of (await readBz2Text(join(RAW_DIR, 'jpn_sentences_with_audio.tsv.bz2'))).split(
  '\n',
)) {
  const [sid, aid, user, licence] = line.split('\t')
  if (!sid || !aid || !licence || !ALLOWED_AUDIO.has(licence.trim())) continue
  const sentenceId = Number.parseInt(sid, 10)
  if (!audioBySentence.has(sentenceId))
    audioBySentence.set(sentenceId, {
      id: Number.parseInt(aid, 10),
      speaker: user ?? '',
      licence: licence.trim(),
    })
}

// Up to three sentences per word, shortest first (short sentences teach the word, long ones test it).
const vocabLevelById = new Map(vocab.map((v) => [v.id, v.level]))
const perWord = new Map<string, RawExample[]>()
for (const ex of examples) {
  const list = perWord.get(ex.word) ?? []
  if (list.length < 3 && !list.some((e) => e.tatoebaId === ex.tatoebaId)) list.push(ex)
  perWord.set(ex.word, list)
}
for (const list of perWord.values()) list.sort((a, b) => a.jp.length - b.jp.length)
const sentences: SentenceItem[] = []
const seenSentence = new Set<string>()
for (const [word, list] of perWord) {
  for (const ex of list) {
    const key = `${word}|${ex.tatoebaId}`
    if (seenSentence.has(key)) continue
    seenSentence.add(key)
    const audio = audioBySentence.get(ex.tatoebaId)
    sentences.push({
      id: `s:${ex.tatoebaId}`,
      tatoebaId: ex.tatoebaId,
      jp: ex.jp,
      en: ex.en,
      word,
      form: ex.form,
      contributor: contributor.get(ex.tatoebaId) ?? 'unknown',
      ...(audio
        ? {
            audio: {
              id: audio.id,
              file: `/audio/${audio.id}.mp3`,
              speaker: audio.speaker,
              licence: audio.licence,
            },
          }
        : {}),
    })
  }
}

// 4d. Download the licensed clips this build references (idempotent; skips files already present).
const AUDIO_DIR = join('public', 'audio')
mkdirSync(AUDIO_DIR, { recursive: true })
const clips = [
  ...new Map(sentences.filter((x) => x.audio).map((x) => [x.audio!.id, x.audio!])).values(),
]
let downloaded = 0
const queue = [...clips]
async function worker() {
  for (let clip = queue.shift(); clip; clip = queue.shift()) {
    const dest = join(AUDIO_DIR, `${clip.id}.mp3`)
    if (existsSync(dest)) continue
    await download(`https://tatoeba.org/audio/download/${clip.id}`, dest)
    downloaded++
  }
}
await Promise.all(Array.from({ length: 4 }, worker))
writeFileSync(
  join(AUDIO_DIR, 'CREDITS.txt'),
  [
    'Sentence recordings from Tatoeba contributors (https://tatoeba.org). One line per clip: id, speaker, licence.',
    ...clips.map((c) => `${c.id}\t${c.speaker}\t${c.licence}`),
  ].join('\n') + '\n',
)

// 4e. Kana from the Unicode Character Database: names → Hepburn romanisation.
const HEPBURN: Record<string, string> = {
  si: 'shi',
  ti: 'chi',
  tu: 'tsu',
  hu: 'fu',
  zi: 'ji',
  di: 'ji',
  du: 'zu',
  sya: 'sha',
  syu: 'shu',
  syo: 'sho',
  tya: 'cha',
  tyu: 'chu',
  tyo: 'cho',
  zya: 'ja',
  zyu: 'ju',
  zyo: 'jo',
  dya: 'ja',
  dyu: 'ju',
  dyo: 'jo',
}
const kana: import('@/packs/ja/types').KanaItem[] = []
{
  const lines = readFileSync(join(RAW_DIR, 'UnicodeData.txt'), 'utf8').split('\n')
  const seen = new Map<string, string>()
  for (const line of lines) {
    const [hex, name] = line.split(';')
    if (!hex || !name) continue
    const m = /^(HIRAGANA|KATAKANA) LETTER (SMALL )?([A-Z]+)$/.exec(name)
    if (!m) continue
    const cp = Number.parseInt(hex, 16)
    if (cp < 0x3041 || cp > 0x30fa || (cp > 0x3096 && cp < 0x30a1)) continue
    const char = String.fromCodePoint(cp)
    const script = m[1] === 'HIRAGANA' ? 'hiragana' : 'katakana'
    const small = Boolean(m[2])
    const raw = m[3]!.toLowerCase()
    if (['va', 'vi', 've', 'vo'].includes(raw) && script === 'hiragana') continue
    const romaji = HEPBURN[raw] ?? raw
    // Row, vowel and voicing come from the Unicode name (ti, tu, si…) devoiced, so じ and ぢ keep
    // their own rows and pair with their own katakana.
    const hasVowel = /[aiueo]$/.test(raw)
    const vowel = hasVowel ? raw.slice(-1) : raw
    const consonant = hasVowel ? raw.slice(0, -1) : ''
    const devoiced: Record<string, string> = { g: 'k', z: 's', d: 't', b: 'h', p: 'h' }
    const row = consonant.replace(/^[gzdbp]/, (c) => devoiced[c] ?? c)
    const voicing = /^[gzdb]/.test(consonant)
      ? 'dakuten'
      : /^p/.test(consonant)
        ? 'handakuten'
        : 'none'
    const key = `${script}:${raw}:${small}`
    if (seen.has(key)) continue
    seen.set(key, char)
    kana.push({
      id: `kana:${char}`,
      char,
      script,
      romaji,
      unicodeName: name,
      small,
      voicing,
      row,
      vowel,
    })
  }
  const nameKey = (k: (typeof kana)[number]) => k.unicodeName.replace(/^(HIRAGANA|KATAKANA) /, '')
  const h = new Map(kana.filter((k) => k.script === 'hiragana').map((k) => [nameKey(k), k.char]))
  const k2 = new Map(kana.filter((k) => k.script === 'katakana').map((k) => [nameKey(k), k.char]))
  for (const item of kana) {
    const other = (item.script === 'hiragana' ? k2 : h).get(nameKey(item))
    if (other) item.pair = other
  }
}

// 4f. Placement-test pseudowords: kana strings that are not readings of any JMdict entry.
const pseudowords: Array<{ text: string; mora: number }> = []
{
  const syllables = kana
    .filter(
      (k) =>
        k.script === 'hiragana' &&
        !k.small &&
        k.voicing === 'none' &&
        !['n', 'wo', 'wi', 'we', 'vu'].includes(k.romaji),
    )
    .map((k) => k.char)
  let seed = 20261006
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const used = new Set<string>()
  while (pseudowords.length < 80) {
    const mora = 2 + Math.floor(rand() * 3)
    let text = ''
    for (let i = 0; i < mora; i++) text += syllables[Math.floor(rand() * syllables.length)]
    if (used.has(text) || allReadings.has(text)) continue
    used.add(text)
    pseudowords.push({ text, mora })
  }
}

// 4g. Confusable kanji: pairs sharing most components with a similar stroke count, two per kanji at most.
const confusables: Array<{ a: string; b: string; shared: string[]; similarity: number }> = []
{
  const withParts = kanji.filter((k) => k.components.length >= 2)
  const perKanji = new Map<string, number>()
  const candidates: Array<{ a: string; b: string; shared: string[]; similarity: number }> = []
  for (let i = 0; i < withParts.length; i++) {
    const a = withParts[i]!
    const A = new Set(a.components)
    for (let j = i + 1; j < withParts.length; j++) {
      const b = withParts[j]!
      if (Math.abs(a.strokes - b.strokes) > 1) continue
      const B = new Set(b.components)
      const shared = [...A].filter((c) => B.has(c))
      if (shared.length < 2) continue
      const similarity = shared.length / new Set([...A, ...B]).size
      if (similarity >= 0.66) candidates.push({ a: a.char, b: b.char, shared, similarity })
    }
  }
  candidates.sort((x, y) => y.similarity - x.similarity)
  for (const c of candidates) {
    if ((perKanji.get(c.a) ?? 0) >= 2 || (perKanji.get(c.b) ?? 0) >= 2) continue
    perKanji.set(c.a, (perKanji.get(c.a) ?? 0) + 1)
    perKanji.set(c.b, (perKanji.get(c.b) ?? 0) + 1)
    confusables.push(c)
  }
}

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
for (const item of [...strokes, ...kanaStrokes]) {
  const r = StrokeItemSchema.safeParse(item)
  if (!r.success)
    problems.push(
      `strokes ${item.char}: ${r.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
    )
}
for (const item of kana) {
  const r = KanaItemSchema.safeParse(item)
  if (!r.success)
    problems.push(
      `kana ${item.char}: ${r.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
    )
}
for (const item of sentences) {
  const r = SentenceItemSchema.safeParse(item)
  if (!r.success)
    problems.push(
      `sentence ${item.id}: ${r.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ')}`,
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
  files: { kanji: {}, vocab: {}, strokes: {}, sentences: {} },
  counts: { kanji: {}, vocab: {}, strokes: {}, sentences: {} },
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
  const st = strokes.filter((x) => kanjiLevel.get(x.char) === level)
  const se = sentences.filter((x) => vocabLevelById.get(x.word) === level)
  const sPath = `strokes-${level}.json`
  const ePath = `sentences-${level}.json`
  const sw = writeJson(join(PACKS_DIR, sPath), {
    meta: { language: 'ja', kind: 'strokes', level, generated, provenance: PROVENANCE_PATH },
    items: st,
  })
  const ew = writeJson(join(PACKS_DIR, ePath), {
    meta: { language: 'ja', kind: 'sentences', level, generated, provenance: PROVENANCE_PATH },
    items: se,
  })
  files.push({
    path: sPath,
    kind: 'strokes',
    level,
    records: st.length,
    ...sw,
    sources: ['kanjivg'],
    transform:
      'KanjiVG stroke paths (109×109 box) in drawing order, stroke-number label positions, and the kvg:element component tree, for every kanji in this level.',
  })
  files.push({
    path: ePath,
    kind: 'sentences',
    level,
    records: se.length,
    ...ew,
    sources: ['jmdict', 'tatoeba-jpn-sentences', 'tatoeba-jpn-audio'],
    transform:
      'JMdict example sentences (Tatoeba/Tanaka corpus pairs linked to a sense) for words in this level, up to three per word, shortest first; the Japanese contributor from Tatoeba\u2019s per-language export; a clip reference only when the recording is CC BY, CC BY-SA, CC BY-NC or CC0.',
  })
  index.files['kanji']![level] = kPath
  index.files['vocab']![level] = vPath
  index.files['strokes']![level] = sPath
  index.files['sentences']![level] = ePath
  index.counts['kanji']![level] = k.length
  index.counts['vocab']![level] = v.length
  index.counts['strokes']![level] = st.length
  index.counts['sentences']![level] = se.length
}
{
  const kw = writeJson(join(PACKS_DIR, 'strokes-kana.json'), {
    meta: {
      language: 'ja',
      kind: 'strokes',
      level: 'kana',
      generated,
      provenance: PROVENANCE_PATH,
    },
    items: kanaStrokes,
  })
  files.push({
    path: 'strokes-kana.json',
    kind: 'strokes',
    level: 'kana',
    records: kanaStrokes.length,
    ...kw,
    sources: ['kanjivg'],
    transform: 'KanjiVG stroke paths for hiragana and katakana.',
  })
  index.files['strokes']!['kana'] = 'strokes-kana.json'
  index.counts['strokes']!['kana'] = kanaStrokes.length
  const kw2 = writeJson(join(PACKS_DIR, 'kana.json'), {
    meta: { language: 'ja', kind: 'kana', generated, provenance: PROVENANCE_PATH },
    items: kana,
  })
  files.push({
    path: 'kana.json',
    kind: 'kana',
    records: kana.length,
    ...kw2,
    sources: ['unicode-ucd'],
    transform:
      'Hiragana and katakana letters from UnicodeData.txt with Hepburn romanisation derived from the Unicode name (SI→shi, TI→chi, TU→tsu, HU→fu, ZI/DI→ji, DU→zu, plus the ya/yu/yo digraph forms), small/voicing flags, gojūon row and vowel, and the counterpart in the other script.',
  })
  const pw = writeJson(join(PACKS_DIR, 'placement.json'), {
    meta: { language: 'ja', kind: 'placement', generated, provenance: PROVENANCE_PATH },
    items: pseudowords,
  })
  files.push({
    path: 'placement.json',
    kind: 'placement',
    records: pseudowords.length,
    ...pw,
    sources: ['jmdict', 'unicode-ucd'],
    transform:
      'Eighty seeded random 2–4 mora hiragana strings verified absent from every JMdict reading; shown in the placement test as non-words, never as vocabulary.',
  })
  const cw = writeJson(join(PACKS_DIR, 'confusables.json'), {
    meta: { language: 'ja', kind: 'confusables', generated, provenance: PROVENANCE_PATH },
    items: confusables,
  })
  files.push({
    path: 'confusables.json',
    kind: 'confusables',
    records: confusables.length,
    ...cw,
    sources: ['kradfile', 'kanjidic2'],
    transform:
      'Kanji pairs sharing at least two KRADFILE components with Jaccard similarity ≥ 0.66 and stroke counts within one, at most two pairs per kanji.',
  })
  index.files['kana'] = { all: 'kana.json' }
  index.files['placement'] = { all: 'placement.json' }
  index.files['confusables'] = { all: 'confusables.json' }
  index.counts['kana'] = { all: kana.length }
  index.counts['placement'] = { all: pseudowords.length }
  index.counts['confusables'] = { all: confusables.length }
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
console.log(
  `Kanji without KanjiVG strokes: ${missingStrokes.length}${missingStrokes.length ? ' (' + missingStrokes.join('') + ')' : ''}; kana strokes: ${kanaStrokes.length}`,
)
console.log(
  `Kanji without KRADFILE components: ${kanji.filter((k) => k.components.length === 0).length}`,
)
console.log(
  `Sentences: ${sentences.length} for ${perWord.size} words; with licensed audio: ${sentences.filter((x) => x.audio).length} (${clips.length} clips, ${downloaded} downloaded now)`,
)
console.log(
  `Kana: ${kana.length}; pseudowords: ${pseudowords.length}; confusable pairs: ${confusables.length}`,
)
console.log(`Wrote ${files.length} files to ${PACKS_DIR}.`)
