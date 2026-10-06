# Kintsugi — working notes for Claude Code

Installable PWA for learning Japanese kanji and vocabulary from kana to JLPT N1. Plan: PLAN.md. Progress log: PROGRESS.md (update at every milestone).

## Commands (all cross-platform: Windows, macOS, Linux)

- `npm run dev` — Vite dev server. `npm run build` / `npm run preview` (port 4173).
- `npm run verify` — typecheck, lint, format check, unit tests, build, byte budgets, e2e, Lighthouse, placeholder scan. Must be green at every milestone.
- `npm run test:e2e` — Playwright against the production preview. Set `PW_WEBKIT=1` (or `CI=1`) to add the WebKit project after `npx playwright install webkit`.
- `npm run data:update` — fetch sources → build packs → verify hashes → 50-entry spot-check. Run quarterly at least (EDRDG licence requires regular updates).

## Conventions

- TypeScript strict, `noUncheckedIndexedAccess`. Path alias `@/` → `src/`.
- `src/engine` is language-agnostic and DOM-free (pure functions, tested with Vitest). `src/packs` holds the pack schema (zod) and loaders. `src/app` is React. `scripts/data` is the build-time pipeline.
- Every Japanese string renders inside an element with `lang="ja"`; furigana uses `<ruby><rt>`.
- Springs: damping 1.0 by default (Motion `bounce: 0`), bounce only after a flick. Honour `prefers-reduced-motion` in every animated component.
- Copy is warm and plain. No jargon, no placeholders. "Memory aid" never "etymology".
- Commit messages: imperative, one line of what and why. Push at every milestone.

## Content rules (binding)

- Never write readings, meanings, stroke data, sentences, frequency or JLPT levels by hand. Everything comes from `public/packs` built by `scripts/data` with `provenance.json`.
- JLPT levels are unofficial (Jonathan Waller's lists); the UI says so.
- SKIP codes are stripped from KANJIDIC2 (separate NC licence). Audio ships only with CC BY / CC BY-NC licences and per-clip credit.
- Credits live on the Sources screen (`/about`), which is reachable from Settings.

## Gotchas

- Playwright: this cloud VM has Chromium preinstalled under `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` (build 1194; the config falls back to it when Playwright's own build is missing). WebKit works after `npx playwright install webkit && npx playwright install-deps webkit`; then run `PW_WEBKIT=1 npm run test:e2e`.
- Never `pkill -f "vite preview"` from a shell whose own command line contains that string; use `ps -eo pid,args | grep '[v]ite preview'`.
- Lighthouse runs before the e2e suite in `verify` on purpose: right after Playwright's two workers finish, this VM is still busy enough to add 300–400 ms to the simulated LCP (2.2 s idle vs 2.6 s straight after e2e).
- Stale preview: `npm run lighthouse` refuses to start while anything answers on port 4174, because it would measure that server instead of the fresh build. Find it with the `ps` line above and `kill <pid>` (never from a command that itself contains the pattern).
- Vercel: `vercel.json` carries the CSP, cache headers and the SPA rewrite. `sw.js` and `index.html` are `max-age=0`.
- ts-fsrs cards serialise `Date`s as ISO strings; rehydrate on load.
- three is pinned to 0.182.0 on purpose: 0.183+ logs a `THREE.Clock` deprecation warning from inside react-three-fiber 9.8, and the console must stay clean. Bump both together once r3f moves to `Timer`.
- Tracing and the 3D scene work on points from `src/engine/stroke-path.ts`, never `getPointAtLength`, so tests run in Node and e2e can sample strokes from the pack file.
- iOS Safari: no `beforeinstallprompt`, no Vibration API, speech voices may arrive late (`voiceschanged`).
- Don't delete old hashed assets before clients update (Safari unregisters a worker whose script 404s).
