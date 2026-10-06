# PROGRESS.md — milestone log

Plan: PLAN.md. Update this file at every milestone so work survives context compaction or a model switch.

## Status

- [x] M0 Scaffold (2026-10-06)
- [ ] M1 Prototype (pause for iPhone check)
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

## Spot-checks

(none yet)
