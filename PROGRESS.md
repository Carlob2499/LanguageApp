# PROGRESS.md — milestone log

Plan: PLAN.md. Update this file at every milestone so work survives context compaction or a model switch.

## Status

- [x] M0 Scaffold (2026-10-06)
- [x] M1 Prototype, built and pushed (2026-10-06); waiting on the Vercel import for the iPhone check
- [ ] M2 Full content pipeline
- [ ] M3 Learning engine
- [ ] M4 Kanji study depth
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

## Spot-checks

(none yet)
