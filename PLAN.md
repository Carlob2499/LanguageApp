# Kintsugi — JLPT kanji & vocabulary PWA: build plan

Working product name: **Kintsugi** (金継ぎ, repairing cracks with gold). Tagline: "Mistakes, repaired in gold." One constant to rename.

## Context

Build an installable PWA for learning Japanese vocabulary and kanji from true beginner (kana) to JLPT N1 in the empty repo `Carlob2499/LanguageApp`. iPhone is the daily-review device; desktop is its own keyboard-first experience. Every reading, meaning, stroke, sentence and level tag comes from licensed datasets through a build-time pipeline with a provenance manifest; nothing is written from memory. Hosting is Vercel. Hikkoshi (`Carlob2499/JapaneseLearningApp`) is not reachable from this session, so the pipeline, pack schema and scheduler are built fresh.

### Decisions already made with you (2026-10-06)

| Question       | Answer                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Scope          | Guided N5 → N1, all five levels complete                                                                                       |
| Entry point    | True beginner, with a placement pre-test                                                                                       |
| Art direction  | **Urushi**: lacquer and kintsugi                                                                                               |
| Handwriting    | Finger stroke-order tracing on KanjiVG paths, forgiving matching, in v1                                                        |
| Audio          | Tatoeba recorded audio where licensed, on-device speech otherwise (see Content plan: the licensed set is small)                |
| Storage / sync | Device-first; encrypted sync via a Vercel function + Vercel Blob, no accounts; you create the Blob store once in the dashboard |
| Deploy         | Vercel Git integration (you import the repo on vercel.com once)                                                                |
| Reminders      | Local reminder time + app badge, no push server                                                                                |
| Wireframes     | Text, in this plan                                                                                                             |
| Check-ins      | Pause after Milestone 1 (prototype live on Vercel)                                                                             |

### Things only you can do (each is a few taps on the phone)

1. vercel.com → sign in with GitHub → Add New → Project → import `LanguageApp` → Deploy. Needed before Milestone 1 can go live.
2. Vercel project → Storage → Create → Blob → connect to the project. Needed for sync (Milestone 6); the app works fully offline until then.
3. Optional: grant the Claude GitHub App access to `JapaneseLearningApp` if you want me to compare against Hikkoshi later.

## 1. Decisions table

| Area                   | Choice (version verified on npm 2026-10-06)                                                                                                                               | Why                                                                                                                                                         | Rejected                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Language               | TypeScript 5.9 line, strict                                                                                                                                               | Ecosystem plugins (eslint, vite) are proven on 5.x; TS 7 (native compiler, 7.0.2) stays out until its plugin story is confirmed                             | TS 7 now                                                                                                    |
| Framework              | React 19.3 + Vite 8.3, client-side SPA, route-level code splitting                                                                                                        | Largest 3D and spring ecosystem (react-three-fiber ~7M weekly downloads vs Threlte ~73K); Vite SPA deploys on Vercel with zero config                       | SvelteKit 3 + Threlte (thin 3D ecosystem); Next.js (SSR machinery an offline app doesn't use)               |
| Rendering              | Static `index.html` shell with inline critical CSS, no SSR; `prefers-color-scheme` + manual theme                                                                         | Offline-first; nothing to render on a server                                                                                                                | SSR/prerender (no SEO need)                                                                                 |
| Routing                | TanStack Router 1.170 (library mode)                                                                                                                                      | Type-safe, 31 KB gzip, no framework-mode build step                                                                                                         | React Router 8 (60 KB, framework mode adds SSR plumbing)                                                    |
| State                  | Zustand 5.0 for session/UI state; Dexie `liveQuery` for persisted data                                                                                                    | Tiny; persisted data has one source of truth (IndexedDB)                                                                                                    | Redux Toolkit (weight), React context only (re-render cost in review loop)                                  |
| Storage                | Dexie 4.4 over IndexedDB; `dexie-export-import` 4.4 for backup files; `navigator.storage.persist()` requested after install                                               | liveQuery, cross-tab updates, export/import ready-made, Apache-2.0; iOS "connection closed" errors wrapped with a reopen-and-retry                          | raw IndexedDB / idb (hand-rolled reactivity), localStorage (size)                                           |
| SRS                    | ts-fsrs ^5.4.2 (FSRS-6, MIT, 7 KB gzip), default parameters, desired retention 0.90 exposed as a setting (0.80–0.95), full review log kept                                | Benchmarked ahead of SM-2 family on 727M reviews; works cold with population defaults; `reschedule()` lets us rebuild state after upgrades                  | SM-2 (worse scheduling), FSRS optimizer in v1 (needs hundreds of reviews; logged for later), ts-fsrs 6 beta |
| Animation              | Motion 14 (springs, drag, layout) + CSS View Transitions where supported                                                                                                  | Spring API maps to Apple's damping/response; interruptible drag                                                                                             | GSAP (licence/size), CSS-only (not interruptible)                                                           |
| 3D                     | three 0.186 + @react-three/fiber 9.8 + drei 10.7, WebGL2, lazy chunk                                                                                                      | Component-assembly scene from KanjiVG paths via SVGLoader + ExtrudeGeometry; WebGPU adds nothing we need and iOS 18 lacks it                                | WebGPU (iOS 18 devices), Babylon (size)                                                                     |
| PWA                    | vite-plugin-pwa 2.0 `injectManifest` + Workbox 7.4, custom `sw.ts`                                                                                                        | Full control of versioned caches and a skip-waiting that defers until no review is open                                                                     | `generateSW` (can't defer activation cleanly)                                                               |
| Fonts                  | Fontsource OFL packages subset at build with `subset-font` (harfbuzzjs, pure Node); unicode-range slices per JLPT level                                                   | Cross-platform (no Python); a beginner downloads only kana + N5 glyphs                                                                                      | Python pyftsubset (not Windows-friendly in npm scripts), full Noto (4 MB/weight)                            |
| Pipeline               | Node 22 scripts in TS (`tsx`), streaming XML with `sax`; built packs committed under `public/packs`, raw sources gitignored                                               | Deterministic Vercel builds without 40 MB of downloads; `data:verify` checks pack hashes against the manifest                                               | Building packs on Vercel each deploy (slow, network-dependent)                                              |
| Testing                | Vitest 5.0 (unit), Playwright 1.63 Chromium + WebKit (e2e, visual, offline), @axe-core/playwright 4.13, Lighthouse 13.5 CLI with budgets, size-limit 14.1                 | All run on Windows/macOS/Linux; WebKit is the closest stand-in for iOS Safari in CI                                                                         | Cypress (no WebKit), lhci (unmaintained since 2025-06)                                                      |
| Deploy                 | Vercel Git integration; `vercel.json` with SPA rewrite, CSP and cache headers, `/api` Node 22 functions                                                                   | Zero secrets; previews per PR                                                                                                                               | GitHub Actions + VERCEL_TOKEN (more setup), Pages (no functions), Cloudflare (needs token secrets)          |
| Sync                   | `/api/sync` + @vercel/blob 2.8: one encrypted JSON snapshot per sync key, `ifMatch` for conflicts; AES-GCM key from HKDF(sync key) on device; server sees ciphertext only | No accounts, no DB, nothing to run; Blob Hobby cap (2,000 advanced ops/month) handled by writing once per session end plus manual sync, with a 60/day guard | Passkeys (rpID tied to domain, Home Screen bugs), Firebase (100–150 KB client, Google domains in CSP)       |
| Cross-platform scripts | npm-run-all2, cross-env, rimraf, Node scripts only                                                                                                                        | Every script runs on Windows                                                                                                                                | bash scripts                                                                                                |

Research citations go into PLAN.md with dates: WebKit/Apple release notes (Safari 26.0 2025-09-15, 27.0 2026-09-14), caniuse (fetched 2026-10-06), EDRDG licence page, KanjiVG release r20260714, Tatoeba exports dated 2026-10-03, npm registry (2026-10-06).

## 2. Art direction: Urushi

**Concept.** Lacquerware under low light. Every learnable item is a lacquered piece. A lapse cracks it; relearning fills the crack with gold. Progress is a shelf of vessels, one per level, each showing its seams. Mastery looks like repair, not like a bar filling up. The spectacle is spent in two places only: the gold seams and the 3D assembly scene. Everything else is quiet, dark and precise.

**Palette** (contrast ratios computed with the WCAG formula; a unit test on the token file asserts every text/background pair below).

Dark (default):
| Token | Hex | Use | Ratio on Lacquer |
|---|---|---|---|
| lacquer | #1C0D0B | ground | — |
| lacquer-raised | #2A1512 | cards, sheets | — |
| bone | #F3EDE3 | primary text | 16.2 |
| bone-muted | #C9BFB2 | secondary text | 10.4 |
| bone-faint | #A69B8E | tertiary, placeholders | 6.9 |
| gold | #D9A441 | seams, mastery, primary action fill (lacquer text on gold 8.4) | 8.4 |
| gold-dim | #B8892F | gold hairlines, inactive seams | 6.0 |
| celadon | #7FB3A3 | success, "Good" | 8.0 |
| shu | #E34234 | "Again", destructive fills (lacquer text on shu 4.6) | 4.6 |
| shu-text | #F06A5C | shu as small text | 6.2 |
| bengara | #9A2F1E | accent surfaces (bone text on bengara 6.4); never small text | — |

Light ("paper"): paper #F6F1E7 ground, ink #1C0D0B text (16.8), ink-muted #5A4A44 (7.5), bengara #9A2F1E as accent text (6.7); gold stays a fill/line colour with ink labels (gold on paper is 2.8, so never text); shu gets a darker text variant tuned to ≥ 4.5 in the token test. Materials: `backdrop-filter` only on the tab bar and sheets, never on cards (Apple's "no glass on content" rule); `prefers-reduced-transparency` makes them solid; `prefers-contrast: more` adds a bone hairline border.

**Type system** (typography-scale: base 17 px on phones, 16 px on desktop, ratio 1.25).

- Kanji hero and kanji display: **Shippori Mincho** 400/700 (OFL). Hero size `clamp(88px, 28vw, 160px)`, line-height 1, no tracking (CJK is never tracked negative).
- Japanese UI and body: **Zen Kaku Gothic New** 400/500/700 (OFL), line-height 1.7 body, 1.35 headings.
- Latin display: **Fraunces** variable (opsz, wght; OFL), tracking −0.02em above 32 px.
- Latin body and numerals: **Instrument Sans** 400/500/600 (OFL), line-height 1.5, tracking 0; +0.04em on uppercase labels.
- Scale: 12 caption · 14 small · 17 body · 21 subhead · 26 h3 · 33 h2 · 41 h1 · hero as above. Spacing in rem so iOS text size settings scale the layout; an in-app Japanese text-size control (3 steps) scales kanji, furigana and sentence text together.
- Every Japanese string sits in an element with `lang="ja"`; furigana uses `<ruby><rt>`; `font-feature-settings: "palt"` on Japanese headings only.
- Subsetting and delivery: build step runs `subset-font` on the Fontsource TTF/WOFF2 files to produce, per weight, one slice for kana + punctuation + Latin fallback glyphs and one slice per JLPT level containing exactly that level's kanji (from the packs), each `@font-face` with a `unicode-range`. A beginner downloads kana + N5 only. Fallback stack: `"Zen Kaku Gothic New", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans CJK JP", sans-serif` with `size-adjust` on the fallbacks to limit layout shift; `font-display: swap` for body, `optional` for the hero on first paint with a fade-in once loaded.
- Byte budgets (enforced by size-limit in `npm run verify`): initial JS ≤ 180 KB gzip (3D chunk lazy, ≤ 260 KB gzip); Japanese font bytes on first review session (kana + N5 slices, two weights) ≤ 220 KB; all Japanese font files ≤ 1.2 MB total.

**Motion principles** (apple-design).

1. Springs everywhere a finger touches: damping 1.0, response 0.35 s by default. Bounce (damping 0.8) only after a flick.
2. "Viscous" is the house feel: card settle uses response 0.45 s; reveals are gloss sweeps (a highlight moving across the lacquer), not slides.
3. The gold seam is the only celebratory motion: a stroke-dasharray draw along the crack, 600 ms, on recovery of a lapsed card and on level milestones.
4. Interruptible always: drag re-targets from the live transform; no input lock during transitions.
5. Reduced motion: cross-fades and instant seams; the gloss-tilt (DeviceOrientation, opt-in toggle) and the 3D scene are replaced by static equivalents; no looping ambient motion anywhere.
6. Route changes use View Transitions where supported (Safari 18+), cross-fade otherwise.

**Signature interactions.**

- Mobile: _swipe-to-grade_. Tap the card (or the Reveal button) to see the answer; drag right = Good (celadon edge glows), left = Again (a hairline crack previews along the tile); release past 40% width or with a flick commits. Hard and Easy sit under a long-press on either side and as visible buttons in the thumb row. Undo is a persistent button in the toolbar and rolls back the last grade (ts-fsrs `rollback`). Details (sentences, components, tracing) live in a bottom sheet with two detents, dragged from the card's footer.
- Desktop: keyboard-first. Space = reveal, 1–4 = grade, U = undo, J/K = next/previous in the library, / = search, ⌘K / Ctrl+K = command palette (jump to kanji, start a session, toggle theme). Three-pane split: library | item with the 3D assembly | sentences and relations. Hovering a component in the 3D scene highlights every kanji in the right pane that uses it.

**3D scene ("Assembly").** The kanji's KanjiVG component groups become extruded lacquered pieces floating apart in space; scrubbing (drag on mobile, scroll or drag on desktop) assembles them, gold emissive seams light up at the joins, and tapping a piece names the component and lists other kanji that use it. Non-3D equivalent (reduced motion, no WebGL2, low memory, screen readers): an exploded SVG diagram with the same labelled components and a text list. Rendered only on kanji detail, lazy-loaded, paused when off-screen, capped at 60 fps with `dpr` ≤ 2.

**Copy voice.** Warm and plain. "Nothing due right now. Learn 5 new kanji?" "You're offline. Reviews still work; sync waits." "This backup is from 3 May. Replace what's on this phone?" Mnemonics are labelled "Memory aid", never presented as origin.

## 3. Wireframes (low fidelity)

### Onboarding

Mobile:

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│                  │   │ Do you read kana?│   │ Placement  12/40 │
│   金 継 ぎ        │   │ ( ) Not yet      │   │                  │
│  Kintsugi        │   │ (•) Yes          │   │      確認         │
│                  │   │                  │   │  Do you know this│
│ Learn kanji and  │   │ [Continue]       │   │  word?           │
│ words to N1.     │   └──────────────────┘   │                  │
│ Mistakes get     │   "Not yet" → kana       │ [Don't know][Know]│
│ repaired in gold.│   lessons first, test    │  ─── seam grows ──│
│                  │   skipped.               └──────────────────┘
│ [Start]          │   "Yes" → placement.       → "Start around N4.
│ Restore a backup │                               Change?" → daily
└──────────────────┘                               load, reminder
                                                   time, install guide
```

Desktop: the same three steps centred in a 560 px column on the lacquer ground; the right half shows the vessel shelf filling as the placement estimate moves.

### Kanji study (detail)

Mobile:

```
┌──────────────────┐
│ ← N3 · 駅        🔊│
│                  │
│       駅         │  ← Shippori hero, gold seam if ever lapsed
│   エキ · station  │
│ On: エキ  Kun: —  │
│ [▶ strokes] [✍ trace] [⬡ assemble]   │  ← segmented control
│ ┌──────────────┐ │
│ │ 3D / SVG     │ │  ← assembly scene or exploded SVG
│ └──────────────┘ │
│ Parts: 馬 horse · 尺 shaku           │  ← KRADFILE/KanjiVG
│ Words: 駅前 · 東京駅 · 駅員           │
│ Memory aid (yours) ✎                 │
│ ── sheet handle ──                   │  ← sentences, audio
└──────────────────┘
```

Desktop: library list (left, 280 px) | hero + segmented control + scene (centre) | words, sentences with audio, confusable kanji (right, 360 px). Keyboard: J/K move, T trace, A assemble.

### Review session

Mobile:

```
┌──────────────────┐
│ ✕   ●●●●○○○○  12 │  ← beads = today's queue, undo ↶
│                  │
│  ┌────────────┐  │
│  │            │  │
│  │    駅前    │  │  ← tile; tap or Reveal
│  │            │  │
│  │  (reveal:  │  │
│  │  えきまえ   │  │
│  │  in front  │  │
│  │  of the    │  │
│  │  station)  │  │
│  └────────────┘  │
│ ◀ Again   Good ▶ │  ← drag the tile; long-press for Hard/Easy
│ [Again][Hard][Good][Easy]            │  ← thumb row, 48 px targets
└──────────────────┘
```

Typed-reading cards show a kana input (wanakana converts romaji) and auto-grade; the buttons then read "Wrong / Right, mark Hard / Easy". Desktop: tile centred at 640 px, shortcuts printed under the buttons, sentence context in the right pane.

### Progress

Mobile:

```
┌──────────────────┐
│ Progress         │
│ ┌──┐┌──┐┌──┐┌──┐┌──┐ │  ← five vessels N5…N1,
│ │▓▓││▓ ││  ││  ││  │ │     filled by mastered share,
│ └──┘└──┘└──┘└──┘└──┘ │     gold seams = recovered lapses
│ Due today 12 · New 5 │
│ Retention 91%        │
│ ▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦▦ │  ← 12-week review heatmap (SVG)
│ Streak 14 · 1 freeze │
│ Leeches (3) →        │
└──────────────────┘
```

Desktop: vessels large across the top, heatmap and stats below, each vessel clickable into the level's kanji grid.

### About / Sources

Mobile: a scrolling list of cards, one per dataset: name, version/date, licence (linked), what we changed, and the "unofficial levels" note; then "Data updated: 2026-10-06 · Update procedure" and the open-source licences of the libraries. Desktop: two columns, same content. This screen is reachable from Settings and from the first-run footer.

## 4. Feature map (feature → learning goal → evidence)

| Feature                                                                                     | Goal                                              | Basis                                                                           |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| FSRS scheduling with review log                                                             | Retain more with fewer reviews                    | srs-benchmark (FSRS-6 vs earlier), Cepeda 2008 spacing                          |
| Recall-first cards: reveal then grade; typed readings auto-graded                           | Testing effect                                    | Adesope 2017 (g ≈ 0.5–0.6)                                                      |
| MCQ only for a card's first two exposures and for kana                                      | Lower-effort first contact, then effortful recall | Retrieval practice literature; design judgement                                 |
| Mixed queue; contrast cards for confusable kanji after both are known                       | Discrimination of look-alikes                     | Kornell & Bjork 2008 interleaving                                               |
| Component graph; components introduced before kanji that use them                           | Chunking                                          | Heisig/WaniKani practice; no direct study found, flagged                        |
| User-editable mnemonics, labelled                                                           | Generation effect                                 | Design judgement, labelled as such                                              |
| Stroke-order animation; tracing after first correct recognition; "write from memory" opt-in | Dual coding                                       | Thin evidence; kept out of the rating loop                                      |
| Example sentences (JMdict examples) and later-stage cloze cards                             | Context and multiple exposures                    | Nakata 2008 and general L2 vocab findings                                       |
| Kana module: 5 per sitting, sound + picture cue, recognition first                          | Beginner entry                                    | Mnemonic evidence stronger for hiragana than katakana                           |
| Placement: kana check, then Yes/No staircase with pseudo-items, 30–50 items                 | Right starting point                              | Yes/No vocabulary tests (Meara); result shown as an estimate, user can override |
| Daily load defaults: 10 new, backlog gate, leech prompt at 8 lapses                         | Sustainable sessions                              | Anki conventions                                                                |
| Streak with one weekly freeze, no loss messaging                                            | Motivation without punishment                     | Design judgement                                                                |
| Kintsugi seams on recovered lapses                                                          | Reframe errors                                    | Product metaphor                                                                |
| Audio: recorded where licensed, speech synthesis otherwise                                  | Sound form                                        | Dual coding                                                                     |
| Local reminder time + badge                                                                 | Habit                                             | Platform limits (no push without a server)                                      |

Pseudo-items for the placement test are generated kana strings verified absent from JMdict at build time and are never shown as real words.

## 5. Content plan

| Source                                 | Version                                                                                                                                       | Licence and duties                                                                                        | What we take                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JMdict_e_examp (EDRDG)                 | Daily build, file dated 2026-10-06, 13.1 MB gz                                                                                                | CC BY-SA 4.0; credit on a dedicated screen; "procedure for regular updating" required                     | Entries on the JLPT lists: kanji/kana forms, readings, glosses, POS, priority markers (licensed frequency proxy), and the 32,311 Tatoeba-linked example sentences                                                                                                                                                             |
| KANJIDIC2 (EDRDG)                      | Daily build, 1.5 MB gz                                                                                                                        | CC BY-SA 4.0; SKIP codes are CC BY-NC-SA and are stripped                                                 | On/kun readings, meanings, stroke count, grade, radical; the old `jlpt` field is ignored                                                                                                                                                                                                                                      |
| KRADFILE/RADKFILE (EDRDG, kradzip.zip) | 0.3 MB                                                                                                                                        | CC BY-SA 4.0 (EUC-JP, converted)                                                                          | Component decomposition                                                                                                                                                                                                                                                                                                       |
| KanjiVG                                | r20260714, 22.7 MB zip                                                                                                                        | CC BY-SA 3.0, © Ulrich Apel; credit with link to kanjivg.tagaini.net in our header and on Sources         | Stroke paths, stroke order, `kvg:element` groups for 2,200 kanji + 86 hiragana + 90 katakana                                                                                                                                                                                                                                  |
| Tatoeba (per_language/jpn exports)     | 2026-10-03                                                                                                                                    | Text CC BY 2.0 FR; audio licensed per contributor                                                         | Contributor names for every shipped sentence; audio only where the licence is CC BY 4.0 (27 clips) or CC BY-NC 4.0 (1,282 clips), each credited by username and licence. The 5,111 unlicensed clips are excluded. Audio is downloaded at build from tatoeba.org/audio/download/{id}, served from our origin, cached on demand |
| JLPT vocabulary levels                 | stephenmk/yomitan-jlpt-vocab (CC BY-SA 4.0 repo), data from Jonathan Waller's lists (CC BY)                                                   | Credit Waller and the repo; UI marks levels "unofficial"                                                  | `original_data/n1..n5.csv` → `jmdict_seq` per word (N1 3,427 rows, N2 1,812, others counted at build)                                                                                                                                                                                                                         |
| JLPT kanji levels                      | davidluzgouveia/kanji-data `jlpt_new` field (MIT repo; data credited to Waller)                                                               | Credit; all WaniKani fields dropped at ingest                                                             | ~2,200 kanji → N5…N1                                                                                                                                                                                                                                                                                                          |
| Kana romanisation                      | Unicode Character Database names (Unicode License v3) + a documented Hepburn transform table (SI→shi, TI→chi, TU→tsu, HU→fu, ZI/DI→ji, DU→zu) | Notice                                                                                                    | Kana rows for the beginner module                                                                                                                                                                                                                                                                                             |
| Fonts                                  | Fontsource packages 5.3.0                                                                                                                     | SIL OFL 1.1; licence files shipped; subset fonts keep their names where the OFL allows, renamed otherwise | Subset slices                                                                                                                                                                                                                                                                                                                 |

**Slice size.** All five levels complete: ~2,200 kanji, ~8,000 words (exact counts from the lists at build time), every JMdict example sentence attached to those words (expected 15–20k), licensed audio for ≤ 1,309 sentences. Sentence coverage per word is uneven and words without a sentence are shown without one. That, and the audio subset, are the only starter-set parts.

**Pipeline** (`scripts/data/*.ts`, run with `tsx`, Windows-safe):

- `npm run data:fetch` downloads each source to `data/raw/<source>/` (gitignored) and records URL, size, SHA-256, download date and HTTP Last-Modified.
- `npm run data:build` streams the XML with `sax`, joins the lists, strips SKIP codes, converts KRADFILE, compacts KanjiVG paths, downloads licensed audio, writes `public/packs/ja/*.json` plus `public/packs/ja/provenance.json` (per output file: sources, versions, licence, transform description, record counts, hash).
- `npm run data:verify` recomputes hashes and fails CI if packs and manifest disagree.
- `npm run data:spotcheck` samples 50 random entries, prints pack vs raw source side by side, and appends the result to PROGRESS.md.
- `npm run data:update` = fetch → build → verify → spotcheck. Documented cadence: quarterly, plus a monthly GitHub Actions cron that runs it and opens a PR when packs change. The Sources screen shows the data date.

**Pack schema** (`src/packs/schema.ts`, zod): a language-agnostic `Pack` of `items` (id, kind, fields, media, relations, tags) with a `ja` profile that names the kinds (kana, kanji, vocab, sentence). One test loads a 10-item synthetic `xx` pack through the engine and schedules it, proving the seam.

## 6. Milestones (each ends with `npm run verify` green, PROGRESS.md updated, commit + push)

| #   | Milestone                                                                                                                                                                                                                                                                                                           | Acceptance check                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0   | Scaffold: Vite + React + TS, lint/format, Vitest, Playwright (Chromium + WebKit in CI), size-limit, Lighthouse script, `vercel.json`, CLAUDE.md / PLAN.md / PROGRESS.md                                                                                                                                             | `npm run verify` passes on an empty app; CI workflow green                                                                                             |
| 1   | **Prototype (pause for your iPhone check)**: Urushi tokens and type, app shell with tab bar, onboarding with kana choice, review loop on real N5 kanji + vocab from the pipeline (meaning and typed-reading cards), swipe + buttons + undo, Dexie persistence, FSRS scheduling, installable PWA, deployed on Vercel | Install on iPhone, review 20 cards offline, reload: progress persists; Lighthouse ≥ 90 mobile                                                          |
| 2   | Full content: all five levels, sentences with attribution, components, strokes, licensed audio, provenance manifest, About/Sources, `data:update`, 50-entry spot-check logged                                                                                                                                       | `data:verify` green; Sources screen lists every duty; spot-check 50/50 logged                                                                          |
| 3   | Learning engine: kana module, placement test, session rules (new/backlog/leech), contrast and cloze cards, progress screen with vessels and heatmap, export/import                                                                                                                                                  | Keyboard-only full session passes in e2e; placement e2e lands a scripted user at the expected level                                                    |
| 4   | Kanji study depth: stroke animation, tracing with matcher, component graph, 3D assembly + SVG equivalent, mnemonics                                                                                                                                                                                                 | Tracing e2e with synthetic pointer paths; 3D screenshot and SVG fallback screenshot under reduced motion                                               |
| 5   | Desktop: split views, command palette, shortcuts, richer scene                                                                                                                                                                                                                                                      | e2e at 1440 px covers palette and shortcuts; axe clean                                                                                                 |
| 6   | PWA hardening and sync: SW update flow that waits for session end, persist(), quota errors, local reminders + badge, sync via Blob with pairing QR, CSP, budgets                                                                                                                                                    | Offline e2e: install SW, go offline, finish a session, reload; SW update during a session doesn't interrupt; sync round-trip e2e against a mocked Blob |
| 7   | Stage 5: verify output, visual QA at 4 widths, independent Opus review, /code-review, /security-review, better-interface, REAL-DEVICE-CHECKLIST.md, handoff                                                                                                                                                         | Definition of done in the prompt                                                                                                                       |

## 7. Risks and fallbacks

| Risk                                                                                        | Fallback                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weak devices                                                                                | 3D only when WebGL2 exists, `deviceMemory` ≥ 4 (when reported) and no reduced-motion; otherwise the SVG diagram. Scene capped at dpr 2, paused off-screen                                                                   |
| iOS gaps: no `beforeinstallprompt`, no Vibration API, 7-day storage eviction in Safari tabs | Install guide matching the Share-sheet flow and the iOS 26 "Open as Web App" toggle; haptics only via `navigator.vibrate?.()` on Android, visual + audio feedback elsewhere; persist() after install, export reminder, sync |
| Japanese font weight                                                                        | Level-sliced subsets; system Japanese fonts as `size-adjust`ed fallbacks; hero uses `font-display: optional` + fade                                                                                                         |
| Lost storage                                                                                | Sync snapshot, export file via Web Share (iOS) or download, Dexie reopen-and-retry on connection errors                                                                                                                     |
| Tatoeba audio is thin (≤ 1,309 licensed clips, mostly NC)                                   | Speech synthesis ja-JP from a tap, speaker hidden when no Japanese voice; NC clips labelled on Sources; app is non-commercial                                                                                               |
| Vercel Blob Hobby ops cap                                                                   | One write per session end + manual sync, 60 writes/day guard, no `list()`                                                                                                                                                   |
| Hosting prerequisites need you                                                              | Milestone 1 ships the Vercel config; until you import the repo, previews run from the e2e server and screenshots                                                                                                            |
| WebKit in CI ≠ iOS                                                                          | REAL-DEVICE-CHECKLIST.md covers install, offline relaunch, reduced motion, text size                                                                                                                                        |
| TS 7 / Vite 8 ecosystem churn                                                               | Pin exact versions; `npm ci` in CI; audit at `--audit-level=high`                                                                                                                                                           |
| Speech synthesis voice bugs on iOS                                                          | `voiceschanged` listener + retry, `utterance.lang = 'ja-JP'` fallback, hide control if none                                                                                                                                 |

## 8. Verification (how the result is checked end to end)

- `npm run verify` = `run-s typecheck lint test:unit build budget test:e2e lighthouse` (cross-platform). Output shown at every milestone and in the handoff.
- e2e (Chromium here, Chromium + WebKit in CI): onboarding → placement → review session by keyboard only; swipe grading with synthetic pointer gestures; tracing; offline session and reload; SW update during a session; export/import; sync round-trip with a mocked `/api/sync`.
- Visual QA: Playwright screenshots at 360×780, 430×932, 834×1194 and 1440×900 on every key screen, in dark and paper themes and under reduced motion; I inspect each image and fix differences from this plan.
- Accessibility: axe on every route (zero serious/critical), focus order and visible focus checked in screenshots, `lang="ja"` and `<ruby>` asserted in unit tests of the renderers.
- Performance: Lighthouse mobile on the production preview (≥ 90, LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms), size-limit budgets from section 2.
- Data integrity: `data:verify` in CI; 50-entry spot-check logged in PROGRESS.md; a test asserts no SKIP codes, no unlicensed audio ids, and that every shipped sentence has a contributor credit.
- Security: CSP from `vercel.json` checked by an e2e that asserts the header and zero CSP violations in console; `npm audit --audit-level=high`; no secrets in the client (grep in verify).
- Reviews: independent Opus subagent with PLAN.md + diff + Definition of done, then /code-review, /security-review and better-interface.
- Placeholder scan in verify: fails on lorem, TODO, TBD, placeholder in shipped files.

## 9. Sources behind the decisions

Research notes (dated 2026-10-06, written by research subagents and kept verbatim) live in `docs/research/`:

- `platform-support.md` — iOS Safari / Chrome support matrix with per-row sources (WebKit release notes, caniuse, MDN).
- `learning-science.md` — spacing, testing effect, interleaving, FSRS benchmark, ts-fsrs API, placement-test design.
- `data-sources.md` — EDRDG licence duties, KanjiVG, Tatoeba exports, JLPT list provenance, fonts.
- `stack-and-vercel.md` — package versions, PWA tooling, Vercel deploy and Blob limits, CSP, handwriting approaches.
- `design-awards.md` — award-site patterns and SRS app weaknesses.

Facts verified directly in this session (2026-10-06): ts-fsrs 5.4.2 MIT (npm registry); JMdict_e_examp.gz 13.1 MB, kanjidic2.xml.gz 1.5 MB, kradzip.zip 0.3 MB (www.edrdg.org, Last-Modified 2026-10-06); KanjiVG r20260714 zip 22.7 MB containing 6,703 base SVGs including 86 hiragana and 90 katakana; Tatoeba Japanese audio: 6,420 clips, 27 CC BY 4.0, 1,282 CC BY-NC 4.0, 5,111 without licence; Google Fonts serves Zen Kaku Gothic New in ~120 unicode-range slices per weight; yomitan-jlpt-vocab `original_data/n*.csv` carries `jmdict_seq` per word.
