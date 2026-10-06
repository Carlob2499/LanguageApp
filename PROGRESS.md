# PROGRESS.md — milestone log

Plan: PLAN.md. Update this file at every milestone so work survives context compaction or a model switch.

## Status

- [x] M0 Scaffold (2026-10-06)
- [x] M1 Prototype, built and pushed (2026-10-06); waiting on the Vercel import for the iPhone check
- [x] M2 Full content pipeline + design overhaul (2026-10-06)
- [x] M3 Learning engine (2026-10-06)
- [x] M4 Kanji study depth (2026-10-06)
- [ ] M5 Desktop
- [ ] M6 PWA hardening and sync
- [ ] M7 Verify, review, hand off

## Log

### 2026-10-06 — Plan approved

- Stages 1–3 complete. Decisions and research in PLAN.md and docs/research/.
- Waiting on the user for: Vercel repo import (before M1 goes live), Blob store (before M6).

### 2026-10-06 — M0 Scaffold

- Vite 8 + React 19 + TS 5.9, TanStack Router, Vitest, Playwright (Chromium here, +WebKit in CI), size-limit, Lighthouse budget script, placeholder scan, `vercel.json` with CSP and cache headers, CI workflow.
- `npm run verify` green: 26 unit tests, 4 e2e, Lighthouse mobile perf 0.99 / a11y 0.95 / best practices 1.00, LCP 1.9 s, CLS 0, TBT 27 ms; initial JS 95 kB gzip (budget 180).
- Gotchas found: Vite 8 uses rolldown (`rolldownOptions.output.codeSplitting.groups`, not `manualChunks`); Playwright 1.63 wants Chromium 1243 while the VM ships 1194, so the config falls back to `/opt/pw-browsers/chromium`; `vite preview` readiness is detected by polling the URL.
- Open: Lighthouse flags one colour-contrast node on the shell; tracked into M1 token work.

### 2026-10-06 — M1 Prototype

- Content pipeline (`npm run data:update` minus spot-check): JMdict_e_examp, KANJIDIC2, KRADFILE, Waller JLPT lists (via yomitan-jlpt-vocab and kanji-data) → `public/packs/ja/{kanji,vocab}-N*.json` + `index.json` + `provenance.json`. 2,211 kanji and 7,747 words; 0 listed items missing from the sources; SKIP codes never read.
- Fonts: `npm run fonts:build` subsets Zen Kaku Gothic New 400/700, Shippori Mincho 700 (base + per-level slices from the packs), Instrument Sans and Fraunces (Latin subset). First N5 session fonts: 385 kB raw (plan said 220 kB; N5 words use ~500 distinct characters, not 79, and the hero face is a second CJK family). Latin faces use `font-display: optional`.
- Engine: ts-fsrs 5.4.2 wrapper with exact snapshot-based undo (ts-fsrs `rollback` is not an exact inverse for learning-state due dates), queue builder with new-card weaving and backlog gate, pure session reducer with in-session re-queue of learning steps. 45 unit tests.
- App: Urushi tokens, welcome flow (level + daily load), Today, Review (tile with swipe-to-grade, reveal, typed readings via wanakana, four grades, undo, keyboard shortcuts), Library, Sources stub. Dexie persistence, session resume after reload, settings mirrored to localStorage so first paint never waits on IndexedDB.
- Routing: replaced TanStack Router with a 200-line in-house router (static + `:param` routes, lazy components, guards, View Transitions). Initial JS went from 158 kB to 76 kB gzip; Lighthouse mobile LCP from ~2.7 s to 2.3–2.5 s (median of 3; VM noise is ±0.3 s). More headroom is an M6 item.
- `npm run verify` green: 45 unit, 8 e2e (onboarding → review → undo → reload-resume; keyboard-only), budgets, Lighthouse perf 0.95 / a11y 1.00 / best practices 1.00, no console errors, no placeholder text.
- Screenshots reviewed at 360/430/834/1440 px (`npm run qa:screenshots`); fixed the Today watermark overlapping the stats.
- Known gaps for the iPhone check: no kana module or placement test yet (M3), no sentences/audio/strokes (M2/M4), Sources screen lists duties but not yet every dataset (M2).

### 2026-10-06 — M2 Content pipeline and the immersive redesign

- Pipeline now also builds `strokes-N*.json` + `strokes-kana.json` (KanjiVG r20260714: every level kanji, 86 hiragana, 90 katakana; stroke paths, number positions, component tree), `components` on each kanji (KRADFILE/KRADFILE2, EUC-JP decoded), and `sentences-N*.json` (JMdict example pairs, up to three per word, credited to the Tatoeba contributor from the per-language export, linked to the sentence page). Licensed audio: only 7 of the sentences our packs use have a CC BY / CC BY-NC / CC BY-SA / CC0 recording; those 7 clips ship under `public/audio` with `CREDITS.txt`. The rest falls back to on-device speech.
- `npm run data:spotcheck` samples 20 kanji, 20 words and 10 sentences and compares them field by field with the raw KANJIDIC2 / JMdict records; result below. `npm run data:update` is complete, and `.github/workflows/data-update.yml` runs it monthly and opens a PR.
- Sources screen rebuilt from `provenance.json`: every dataset, its licence link, attribution wording, fetch date and hash, the audio credits, the built files and their transforms, the software licences.
- Design overhaul after the user asked for something far more immersive: ambient gold-dust lacquer canvas with vignette and a static grain tile; custom brush-weight icon set; floating glass tab bar with a gold underglow that glides between tabs (Motion layoutId); kanji that write themselves stroke by stroke (`StrokeGlyph`, CSS dash animation on `pathLength=1`, no DOM measurement) on Welcome, Today's kanji of the day, review reveals and the kanji detail screen; procedural cracks seeded by card key that draw on Again and get retraced in gold as a card recovers; a filling lacquer vessel for session and level progress; furigana as a tappable hint layer; sentences with the word highlighted plus Tatoeba credit; a detent bottom sheet for word details; gold-leaf flecks when a session completes; a shimmer route fallback. New routes: /kanji/:char, /progress, /settings.
- Accessibility: every gold-as-text use now goes through `--accent-text` (bengara on the paper theme); axe passes on Chromium in both schemes.
- Performance work to keep Lighthouse mobile LCP under 2.5 s after the redesign: the tab bar's glow is a CSS glide (Motion stays out of the first paint); the ambient canvas and grain mount 1.2 s after first paint, run at 30 fps, and use no blend modes; SVG drop-shadow filters replaced by static radial glows; the 120 Japanese `@font-face` rules moved to `public/fonts/ja.css`, attached after React's first commit; the welcome hero (glyph, tiles) mounts after first paint in a fixed-height box. Simulated LCP went 3.5 s → 2.3 s; observed real paint stays under 300 ms.

### 2026-10-06 — M3 Learning engine

- Pipeline: `kana.json` (176 letters from UnicodeData.txt with Hepburn romanisation derived from the Unicode names, rows/vowels/voicing, cross-script pairs; Unicode License v3 on Sources), `placement.json` (80 seeded pseudowords verified absent from every JMdict reading), `confusables.json` (207 kanji pairs sharing ≥ 2 KRADFILE components, Jaccard ≥ 0.66, strokes within one, ≤ 2 per kanji).
- Engine: `placement.ts`, a Yes/No staircase with lures (corrected score = hits − false alarms; up at ≥ 0.6, down at < 0.3, two reversals or seven blocks stop it; estimate = highest band cleared), with five unit tests. New card types: `kana-recognition`, `kanji-contrast`, `vocab-cloze`; the last two are generated for items whose base card is in review with stability ≥ 7 days.
- App: welcome asks "Do you read kana?"; "Not yet" starts a kana-first mode where sessions introduce kana row by row and kanji wait until the kana check (10 hiragana, 9 to pass) or the Settings override; "Yes" offers the placement test (/placement) or a manual level. Kana table (/kana) with self-writing kana and counterparts. Multiple-choice cards with keys 1–4 and auto-grading. Backup to a JSON file via the share sheet or download, restore with a confirmation. Settings gained Backup and Kana sections.
- Tests: 50 unit, 14 e2e (adds kana-first session, placement to N5, backup download). CI's e2e web server now binds to 127.0.0.1 (the earlier CI failure was Vite preview on IPv6 localhost).
- Screenshot review (reports/screenshots/m3): the kana table listed や/ゆ/よ/ん inside the a-row because the row derivation stripped a trailing y from every Unicode name, fixed in the pipeline and packs rebuilt; the tab bar now hides during placement; the placement answer buttons no longer wrap; the kana-first Today screen spotlights a kana instead of a kanji.
- Performance: the entry stylesheet is inlined into index.html by a small Vite plugin (one render-blocking round trip fewer); the Lighthouse script now spawns Vite's own binary so the preview dies with the script, refuses to run while port 4174 is occupied (a stale server had been serving older builds and made LCP numbers drift by 350 ms), and takes the median of five runs. Verify on this VM: performance 0.97, LCP 2232 ms, CLS 0.01, TBT 15 ms.
- Deferred: FSRS seeding from placement answers (the plan said seed only claimed-known items with low stability; v1 sets the level only), leech prompts beyond the 8-lapse flag, picture mnemonics for kana.

### 2026-10-06 — M4 Kanji study depth

- Engine: `stroke-path.ts` flattens KanjiVG paths (M, C/c, S/s) into points without the DOM; `tracing.ts` matches a drawn polyline against a stroke (resampled mean distance, start/end distance, length ratio, and a reversed-fit check so backwards strokes are named as such) with a small reducer for the stroke-by-stroke session. 13 unit tests.
- Trace mode on the kanji screen: finger or mouse tracing over the guide, gold snap on a hit, red fade on a miss, the stroke draws itself as a hint after two misses or on "Show me", "Skip stroke", and "From memory" hides the guide. Gold flecks when the character is complete. The stage scrolls itself clear of the tab bar.
- Assemble mode: a lazy react-three-fiber scene (three pinned at 0.182.0, the last release before the Clock deprecation warning that r3f 9.8 triggers) renders each KanjiVG component as lacquered tubes with clearcoat; pieces float apart along the line from the glyph centre with depth spread, assemble on their own after a moment, scrub with a sideways drag, and a tap names the piece and lights it in the hero. Rendering pauses off-screen (IntersectionObserver). The flat equivalent (each part on its own, + … = whole) is the default under reduced motion, without WebGL2 or on devices reporting under 4 GB, and one tap away otherwise. Chunk budget: three + r3f + scene 235 kB gzip, lazy (limit 260).
- Component graph: selecting a part lists other kanji that use it ("寺 also appears in 持, 特, 待…"), matched through KRADFILE directly or, when KRADFILE only lists primitives, through the part's own decomposition.
- Memory aid: a per-kanji note in a new Dexie `notes` table (schema v2, included in backups), labelled "Memory aid (yours)", never pre-filled.
- Tests: 63 unit, 18 e2e (tracing with synthetic pointer paths sampled from the pack, 3D-or-flat render, reduced-motion fallback with axe, memory aid across reload). Screenshots in reports/screenshots/m4 (dark, plus reduced-motion fallback).
- Deferred to M5: keyboard shortcuts for the modes (T/A), the richer desktop scene (environment reflections, hover highlights across panes).

## Spot-checks

(none yet)

### 2026-10-06 — 50/50 matched (20 kanji vs KANJIDIC2, 20 words vs JMdict, 10 sentences vs JMdict examples)

- ok kanji 徳 (N1) on=トク kun= meanings=benevolence; virtue strokes=14
- ok kanji 衷 (N1) on=チュウ kun= meanings=inmost; heart strokes=9
- ok kanji 勁 (N1) on=ケイ kun=つよ.い meanings=strong strokes=9
- ok kanji 止 (N4) on=シ kun=と.まる/-ど.まり/と.める meanings=stop; halt strokes=4
- ok kanji 段 (N3) on=ダン/タン kun= meanings=grade; steps strokes=9
- ok kanji 童 (N2) on=ドウ kun=わらべ meanings=juvenile; child strokes=12
- ok kanji 迷 (N3) on=メイ kun=まよ.う meanings=astray; be perplexed strokes=9
- ok kanji 借 (N4) on=シャク kun=か.りる meanings=borrow; rent strokes=10
- ok kanji 敏 (N1) on=ビン kun=さとい meanings=cleverness; agile strokes=10
- ok kanji 焼 (N2) on=ショウ kun=や.く/や.き/や.き- meanings=bake; burning strokes=12
- ok kanji 於 (N1) on=オ/ヨ kun=おい.て/お.ける/ああ meanings=at; in strokes=8
- ok kanji 精 (N3) on=セイ/ショウ kun=しら.げる/くわ.しい meanings=refined; ghost strokes=14
- ok kanji 隷 (N1) on=レイ kun=したが.う/しもべ meanings=slave; servant strokes=16
- ok kanji 該 (N1) on=ガイ kun= meanings=above-stated; the said strokes=13
- ok kanji 載 (N1) on=サイ kun=の.せる/の.る meanings=ride; board strokes=13
- ok kanji 幣 (N1) on=ヘイ kun=ぬさ meanings=cash; bad habit strokes=15
- ok kanji 紫 (N1) on=シ kun=むらさき meanings=purple; violet strokes=12
- ok kanji 燦 (N1) on=サン kun=さん.たる/あき.らか/きらめ.く meanings=brilliant strokes=17
- ok kanji 亮 (N1) on=リョウ kun=あきらか meanings=clear; help strokes=9
- ok kanji 菖 (N1) on=ショウ kun= meanings=iris strokes=11
- ok vocab 1459460 (N1) 内乱 ないらん = civil war; insurrection
- ok vocab 1385170 (N5) 切符 きっぷ = ticket
- ok vocab 1420680 (N3) 知能 ちのう = intelligence; intellect
- ok vocab 1145910 (N2) レベル = level; standard
- ok vocab 1277880 (N2) 孝行 こうこう = filial piety
- ok vocab 1351430 (N4) 紹介 しょうかい = introduction; presentation
- ok vocab 1206530 (N3) 学ぶ まなぶ = to learn; to study
- ok vocab 1194290 (N5) 火曜日 かようび = Tuesday
- ok vocab 1323280 (N2) 車輪 しゃりん = (vehicle) wheel
- ok vocab 1472870 (N1) 肺 はい = lung
- ok vocab 1422520 (N1) 秩序 ちつじょ = order; discipline
- ok vocab 1446070 (N5) 冬 ふゆ = winter
- ok vocab 1227890 (N1) 休戦 きゅうせん = cease-fire; truce
- ok vocab 1408850 (N1) 打開 だかい = break in the deadlock
- ok vocab 1360920 (N2) 心得る こころえる = to know; to understand
- ok vocab 1076470 (N1) タワー = tower
- ok vocab 1438340 (N1) 天井 てんじょう = ceiling
- ok vocab 1076900 (N2) ダイヤル = dial (e.g. telephone, radio, clock, gauge)
- ok vocab 1194570 (N2) 花嫁 はなよめ = bride
- ok vocab 2859682 (N1) 怒る いかる = to get angry; to get mad
- ok sentence 102433 彼は大学院に進学しないだろう。… / He won't go on to graduate schoo…
- ok sentence 161437 私はいたずらな子供を大目に見る事ができない。… / I cannot be tolerant of naughty …
- ok sentence 75604 入学式も終わりました。同じ沿線の大学です。… / I've already had the entrance ce…
- ok sentence 230002 ありがとう。また、次の日にくるようにします。… / Thanks. Maybe we'll come back.…
- ok sentence 183812 観客は彼のホームランに興奮した。… / His home run excited the crowd.…
- ok sentence 193234 もっと大きい声で言ってください。… / Louder, please.…
- ok sentence 170580 最後にはうまく収まるだろう。… / It'll come right in the end.…
- ok sentence 205978 そよ風で池の面にさざ波が立った。… / A gentle wind made ripples on th…
- ok sentence 97889 彼らはその船を岸にあげた。… / They drew the boat on the beach.…
- ok sentence 205558 それはあまり価値がない。… / It's not worth much.…
