# Engineering stack options and Vercel deployment mechanics for an offline-first Japanese-learning PWA (as of 2026-10-06)

NOTE: This was written to the plan-mode plan file because plan mode forbade writing to the requested path (.../scratchpad/research_notes/JLPT PWA platform and content research/stack_and_vercel.md). Copy it there verbatim.

Conventions: "checked 2026-10-06" = npm registry `/latest` JSON fetched that day (version, license, `dist.unpackedSize`) via https://registry.npmjs.org/<pkg>/latest. Sizes marked "bundlephobia" come from https://bundlephobia.com/api/size?package=<pkg>@<ver> (minified / gzip of the package's main entry; NOT tree-shaken app cost). Weekly downloads from https://api.npmjs.org/downloads/point/last-week/<pkg> (2026-09-28 to 2026-10-04). Anything not fetched from a source this session is labelled UNVERIFIED.

## Framework: React 19 + Vite vs SvelteKit (Svelte 5) vs SolidStart; 3D and spring stories

### Takeaway
React 19 + Vite + react-three-fiber v9 + drei + Motion has the larger, better-maintained 3D and spring ecosystem by every measurable proxy I could fetch (R3F ~7.07M weekly downloads vs Threlte core ~73K, about 97x). Svelte 5 + Threlte is viable and smaller at the framework level, but its 3D ecosystem is much thinner. Several majors have moved since mid-2025 (Vite 8, SvelteKit 3, TypeScript 7, Vitest 5, React Router 8), so version-pin carefully.

### Cited Findings
- react 19.3.0, MIT; react-dom peer range of R3F is `>=19 <19.4` (so 19.3.x is OK, 19.4 would not be until R3F updates) — [npm react](https://registry.npmjs.org/react/latest), [npm R3F](https://registry.npmjs.org/@react-three/fiber/latest) (checked 2026-10-06)
- vite 8.3.3, MIT; @vitejs/plugin-react 6.1.2, MIT (checked 2026-10-06) — [npm vite](https://registry.npmjs.org/vite/latest), [npm plugin-react](https://registry.npmjs.org/@vitejs/plugin-react/latest)
- three 0.186.1, MIT, unpacked 20.4 MB; bundlephobia full-package entry 736 KB min / 185 KB gzip (not tree-shaken; real app cost depends on imports) — [npm three](https://registry.npmjs.org/three/latest), [bundlephobia](https://bundlephobia.com/api/size?package=three@0.186.1)
- @react-three/fiber 9.8.1 (published 2026-09-24, registry modified 2026-10-06), MIT; peers: react >=19 <19.4, three >=0.156; bundlephobia 181 KB min / 57 KB gzip — [npm](https://registry.npmjs.org/@react-three/fiber/latest)
- @react-three/drei 10.7.9 (published 2026-09-25), MIT; peers: react ^19, three >=0.159, @react-three/fiber ^9.0.0 — [npm](https://registry.npmjs.org/@react-three/drei/latest)
- motion 14.0.0 (published 2026-10-02), MIT; peers react/react-dom ^18 || ^19; bundlephobia whole-package entry 141 KB min / 47.6 KB gzip (the entry includes everything; a smaller `m`/LazyMotion path exists but its size was NOT verified) — [npm motion](https://registry.npmjs.org/motion/latest), [bundlephobia](https://bundlephobia.com/api/size?package=motion@14.0.0)
- framer-motion is also at 14.0.0 (MIT); weekly downloads framer-motion 58.5M vs motion 28.3M, so the rename has not fully migrated the ecosystem — [npm framer-motion](https://registry.npmjs.org/framer-motion/latest), [npm downloads](https://api.npmjs.org/downloads/point/last-week/framer-motion)
- Motion React spring transition options (documented): `type: "spring"`, `bounce` (default 0.25, range -1..1), `stiffness` (default 1), `damping` (default 10), `mass` (default 1), `visualDuration` (seconds to visually reach target). The page fetched did not cover `useSpring` or reduced-motion config — [motion.dev transitions](https://motion.dev/docs/react-transitions)
- svelte 5.57.2, MIT; @sveltejs/kit 3.0.1, MIT (SvelteKit is now at a new major, 3.x) — [npm svelte](https://registry.npmjs.org/svelte/latest), [npm kit](https://registry.npmjs.org/@sveltejs/kit/latest)
- @threlte/core 8.6.1 (published 2026-09-24), MIT; @threlte/extras 9.22.0, MIT (core is v8, extras is v9, so "Threlte 8" refers to core only); peers three >=0.172, svelte >=5 — [npm core](https://registry.npmjs.org/@threlte/core/latest), [npm extras](https://registry.npmjs.org/@threlte/extras/latest)
- Threlte describes itself as declarative, state-driven Three.js for Svelte, split into modular packages (extras, rapier physics, Theatre.js animation, flex layout) — [threlte.xyz](https://threlte.xyz/docs/learn/getting-started/introduction)
- Download comparison (weekly, 2026-09-28..10-04): @react-three/fiber 7,071,105; @threlte/core 73,133; svelte 7.72M; react 224M — [R3F](https://api.npmjs.org/downloads/point/last-week/@react-three/fiber), [Threlte](https://api.npmjs.org/downloads/point/last-week/@threlte/core)
- solid-js 1.9.15, MIT, bundlephobia 22 KB min / 8.4 KB gzip; svelte 28 KB min / 10.8 KB gzip; react 8 KB + react-dom 4 KB entry (bundlephobia entry numbers for react/react-dom are misleadingly small, treat as unreliable) — [bundlephobia solid](https://bundlephobia.com/api/size?package=solid-js@1.9.15), [bundlephobia svelte](https://bundlephobia.com/api/size?package=svelte@5.57.2)
- @solidjs/start 2.0.5: npm registry shows license field `None` (missing); not verified from repo — [npm](https://registry.npmjs.org/@solidjs/start/latest)
- typescript 7.0.2 (Apache-2.0) is current latest on npm (major bump) — [npm](https://registry.npmjs.org/typescript/latest)
- Node requirements: vite-plugin-pwa 2.0.0 needs Node >=20.19; Vitest 5.0.3 needs Node ^22.12 || ^24 || >=26; react-router 8.4.0 needs Node >=22.22 — see sections below for sources

### Inferences
- For one 3D scene plus heavy spring UI, R3F+drei+Motion gives the most ready-made helpers and the most StackOverflow-able answers; the download ratio (~97x) is a proxy for community size, not a quality measure.
- The Svelte stack's real advantage is smaller runtime and built-in spring/tween stores (Svelte's own `svelte/motion` springs) — I did not verify these this session, so they are UNVERIFIED.
- A "static SPA with optional /api" fits Vite + React directly; SvelteKit would need `adapter-static` (UNVERIFIED for Kit 3).

### Gaps
- No primary comparison of runtime performance or Threlte feature parity with drei (helpers like Environment, Text, Html, OrbitControls equivalents) was found; Threlte extras 9.22.0 exists but contents were not enumerated.
- SolidStart has no 3D wrapper checked; I did not research solid-three or a Solid spring library.
- Svelte `svelte/motion` spring API and SvelteKit 3 static adapter specifics not fetched.

## PWA tooling: vite-plugin-pwa, Workbox, injectManifest vs generateSW, update flow, iOS caveats

### Takeaway
vite-plugin-pwa 2.0.0 with workbox-build/workbox-window 7.4.1 is current; use `strategies: 'injectManifest'` with a small custom `sw.ts` so you control the deferred skipWaiting. iOS risks are storage quota/eviction and flaky large-install failures; split a small blocking precache from a big background cache.

### Cited Findings
- vite-plugin-pwa 2.0.0 (published 2026-10-03), MIT; peer vite ^3.1 … ^8.0, workbox-build ^7.4.1, workbox-window ^7.4.1, @vite-pwa/assets-generator ^1 || ^2; Node >=20.19 — [npm](https://registry.npmjs.org/vite-plugin-pwa/latest)
- workbox-build 7.4.1, workbox-window 7.4.1, workbox-precaching 7.4.1, workbox-core 7.4.1, all MIT (checked 2026-10-06); workbox-window bundlephobia 5.8 KB min / 2.3 KB gzip — [npm workbox-build](https://registry.npmjs.org/workbox-build/latest), [bundlephobia](https://bundlephobia.com/api/size?package=workbox-window@7.4.1)
- @vite-pwa/assets-generator 2.0.0, @vite-pwa/sveltekit 1.1.0, both MIT — [npm](https://registry.npmjs.org/@vite-pwa/assets-generator/latest), [npm](https://registry.npmjs.org/@vite-pwa/sveltekit/latest)
- injectManifest lets you "build your own service worker"; config `VitePWA({ strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts' })`; template SW: `cleanupOutdatedCaches(); precacheAndRoute(self.__WB_MANIFEST)` with `"WebWorker"` in tsconfig lib — [vite-pwa-org inject-manifest](https://vite-pwa-org.netlify.app/guide/inject-manifest.html)
- `registerType: 'prompt'` is the default and requires the user action to send a `SKIP_WAITING` message; `autoUpdate` calls `self.skipWaiting(); clientsClaim()`. Prompt-mode SW snippet: `self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting() })` — [vite-pwa-org inject-manifest](https://vite-pwa-org.netlify.app/guide/inject-manifest.html)
- Client side: `import { registerSW } from 'virtual:pwa-register'; const updateSW = registerSW({ onNeedRefresh(){}, onOfflineReady(){} })`; calling `updateSW()` reloads with new content. `cleanupOutdatedCaches` is enabled by default with generateSW — [vite-pwa-org prompt-for-update](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html)
- WebKit 7-day rule (2020): ITP deletes all script-writable storage (IndexedDB, LocalStorage, media keys, SessionStorage, Service Worker registrations and cache) after seven days of Safari use without user interaction on the site; Home Screen web apps have their own usage counter and WebKit says it does not expect first-party data in them to be deleted — [WebKit blog 10218](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- Safari 17 storage policy: browser apps get origin quota up to 60% of disk (overall 80%), other apps (e.g. home-screen web apps in that wording: "other apps") 15% per origin (overall 20%); eviction is per-origin LRU; `navigator.storage.persist()` is granted by heuristics such as being opened as a Home Screen Web App. The page notes home screen web apps get the same quotas as browser apps when running standalone (as summarized by the fetch tool; wording slightly ambiguous) — [WebKit blog 14403](https://webkit.org/blog/14403/updates-to-storage-policy/)
- Secondary/anecdotal (low quality, treat as UNVERIFIED): older ~50 MB Safari tab quota across Cache Storage + IndexedDB; large precache on flaky connections can fail install; a repo PR proposes splitting the precache into small blocking install + heavy background download — [search results incl. WebKit bug 199110 and a forum thread](https://bugs.webkit.org/show_bug.cgi?id=199110)

### Inferences
- Versioned caches: Workbox precache entries are revisioned by content hash, so a new build produces a new manifest and `cleanupOutdatedCaches()` evicts stale ones. For a custom runtime cache (big fonts/3D assets) name it with a version string and delete old names in `activate`. The exact `cacheId` option behavior is UNVERIFIED this session.
- Deferred skipWaiting "until idle": not documented; implement it yourself: in the page, `onNeedRefresh` stores a flag; when the app is idle (no active lesson, `requestIdleCallback`, or `visibilitychange` to hidden) call `updateSW(true)` / post `SKIP_WAITING`. workbox-window's `messageSkipWaiting()` also exists but is UNVERIFIED here.
- Keep the precache manifest small (app shell, JS/CSS, kana/kanji core data); fetch the 3D model and large font slices via runtime caching (CacheFirst with expiration) so SW install does not fail on iOS.
- Call `navigator.storage.persist()` and encourage Add to Home Screen to avoid the 7-day wipe.

### Gaps
- No primary source found for precise iOS Safari Cache Storage size limits today; official WebKit statement is only percent-of-disk.
- No fetch of Workbox docs for `cacheId`, `messageSkipWaiting`, or `maximumFileSizeToCacheInBytes` (default 2 MiB for generateSW is from memory, UNVERIFIED).

## Local DB: Dexie v4 vs idb vs raw IndexedDB; export/import; iOS bugs

### Takeaway
Dexie 4.4.6 (Apache-2.0) is the pragmatic choice (liveQuery, cross-tab updates, export/import add-on); idb 8.0.4 (ISC, 1.5 KB gzip) is the minimal alternative. iOS Safari has a history of IndexedDB "connection lost" errors after backgrounding, so wrap DB access with retry/reopen.

### Cited Findings
- dexie 4.4.6, Apache-2.0, bundlephobia 95 KB min / 31 KB gzip; weekly downloads 2.94M — [npm](https://registry.npmjs.org/dexie/latest), [bundlephobia](https://bundlephobia.com/api/size?package=dexie@4.4.6)
- dexie-export-import 4.4.1 (published 2026-09-10), Apache-2.0, peer dexie ^4.4.5; bundlephobia 64 KB min / 17.7 KB gzip — [npm](https://registry.npmjs.org/dexie-export-import/latest)
- idb 8.0.4, ISC, bundlephobia 3.6 KB min / 1.5 KB gzip; weekly downloads 30.9M — [npm](https://registry.npmjs.org/idb/latest), [bundlephobia](https://bundlephobia.com/api/size?package=idb@8.0.4)
- dexie-export-import API: `exportDB()` -> Blob, `importDB()` creates a DB from a Blob, `importInto()` merges into an existing DB; JSON with Typeson encoding for Dates/ArrayBuffers/Blobs; `progressCallback`; streams in chunks (default ~1 MB import, 2000 rows export); CryptoKeys cannot be exported; "Safari has documented Blob handling considerations" — [dexie.org](https://dexie.org/docs/ExportImport/dexie-export-import)
- liveQuery: turns a Dexie querier into an Observable; re-runs when relevant indexed ranges change; mutations are broadcast across tabs/workers; React uses `useLiveQuery()` from `dexie-react-hooks`; don't call non-Dexie async APIs inside the querier (use `Dexie.waitFor()`); false positives possible, no false negatives — [dexie.org liveQuery](https://dexie.org/docs/liveQuery())
- Safari IndexedDB: repeatedly backgrounding Safari during IndexedDB transactions can produce "UnknownError: Connection to Indexed Database server lost"; WebKit bugs 197050, 277615, 235579 and Dexie issue 1776 are linked from search; reports persisted in iOS 17.6 in some wrappers. Dexie >= 4.0.1-beta.7 reportedly closes connections/BroadcastChannel on pagehide and reopens on pageshow to keep bfcache working — [search result list: WebKit 197050](https://bugs.webkit.org/show_bug.cgi?id=197050), [Dexie issue 1776](https://github.com/dexie/Dexie.js/issues/1776) (bug contents were NOT opened; only titles/snippets)
- 7-day eviction and persist() details: see PWA section ([WebKit 10218](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/))

### Inferences
- If you need liveQuery-style reactivity in React, Dexie wins; with idb you would hand-roll subscriptions. For a small app, Dexie's 31 KB gzip is acceptable.
- Mitigate "connection lost": catch `DatabaseClosedError`/`UnknownError`, call `db.open()` again and retry once; write small transactions; keep a periodic dexie-export-import backup (user-triggered download, since Blob download on iOS needs the share sheet).

### Gaps
- Dexie license text for dexie-export-import beyond npm "Apache-2.0" field not read; not checked for any commercial add-on (Dexie Cloud) restrictions.
- Content of the WebKit IndexedDB bugs (fix status on current iOS) not verified.

## Routing and state: TanStack Router vs React Router v7/v8; Zustand v5

### Takeaway
For a pure client-side Vite SPA, TanStack Router (31 KB gzip) is lighter and type-safe; React Router is now at 8.4.0 (60 KB gzip, Node >=22.22 for tooling). Zustand 5.0.15 is tiny.

### Cited Findings
- @tanstack/react-router 1.170.41 (published 2026-09-30), MIT, Node >=20.19; bundlephobia 91 KB min / 31 KB gzip — [npm](https://registry.npmjs.org/@tanstack/react-router/latest), [bundlephobia](https://bundlephobia.com/api/size?package=@tanstack/react-router@1.170.41)
- react-router 8.4.0 (published 2026-09-15), license MIT, peers react/react-dom >=19.2.7, Node >=22.22.0; bundlephobia 192 KB min / 60 KB gzip (full package including framework-mode code; library-mode tree-shaken size smaller, UNVERIFIED) — [npm](https://registry.npmjs.org/react-router/latest), [bundlephobia](https://bundlephobia.com/api/size?package=react-router@8.4.0)
- zustand 5.0.15 (published 2026-08-13), MIT; bundlephobia main entry 856 B min / 489 B gzip (the vanilla entry; the React hook entry is larger, small, exact size UNVERIFIED); weekly downloads 71.5M — [npm](https://registry.npmjs.org/zustand/latest), [bundlephobia](https://bundlephobia.com/api/size?package=zustand@5.0.15)
- Weekly downloads: react-router 68.7M, @tanstack/react-router 25.1M — [npm API](https://api.npmjs.org/downloads/point/last-week/react-router)

### Inferences
- Framework vs library mode distinction (React Router v7+ merged Remix; library mode = `createBrowserRouter`, framework mode = Vite plugin with SSR/pre-render) is from my background knowledge and was NOT re-verified for v8. For an offline PWA SPA, library mode (or TanStack Router) is the fit; framework mode adds build complexity you don't need.
- File-based routing codegen exists in TanStack (`@tanstack/router-plugin`), UNVERIFIED this session.

### Gaps
- No docs fetched for either router's v8/v1.170 migration details or SPA-mode specifics.

## Testing: Vitest, Playwright (WebKit CI), axe, Lighthouse CI, byte budgets

### Takeaway
Vitest 5.0.3, Playwright 1.63.0, @axe-core/playwright 4.13.0 are current. WebKit runs on ubuntu runners with `npx playwright install --with-deps webkit`. @lhci/cli has not been published since 2025-06 (0.15.1) - check it still works with Lighthouse 13; size-limit 14.1.0 is a straightforward byte-budget gate.

### Cited Findings
- vitest 5.0.3 (published 2026-09-30), MIT; peer vite ^6.4 || ^7 || ^8; Node ^22.12 || ^24 || >=26 — [npm](https://registry.npmjs.org/vitest/latest)
- @playwright/test 1.63.0, Apache-2.0 — [npm](https://registry.npmjs.org/@playwright/test/latest)
- Playwright CI docs: use `npx playwright install --with-deps` (browsers + OS deps); Ubuntu runners support Chromium, Firefox, WebKit; official Docker image `mcr.microsoft.com/playwright:v1.63.0-noble`; set workers to 1 in CI for stability; don't cache browser binaries; shard across jobs for big suites — [playwright.dev/docs/ci](https://playwright.dev/docs/ci)
- axe-core 4.14.0, MPL-2.0; @axe-core/playwright 4.13.0, MPL-2.0 (checked 2026-10-06) — [npm axe-core](https://registry.npmjs.org/axe-core/latest), [npm](https://registry.npmjs.org/@axe-core/playwright/latest)
- @lhci/cli 0.15.1, Apache-2.0, last published 2025-06-25; lighthouse 13.5.0, Apache-2.0, unpacked 19 MB — [npm lhci](https://registry.npmjs.org/@lhci/cli/latest), [npm lighthouse](https://registry.npmjs.org/lighthouse/latest)
- size-limit 14.1.0 and @size-limit/file 14.1.0, MIT — [npm](https://registry.npmjs.org/size-limit/latest)
- Playwright's own CI example uses `repository_dispatch` `vercel.deployment.success` and `client_payload.url` to run e2e against a Vercel preview — [Vercel docs](https://vercel.com/docs/git/vercel-for-github)

### Inferences
- Playwright WebKit on Linux is Playwright's patched WebKit build, not real iOS Safari; it won't reproduce iOS storage/eviction/background bugs (general knowledge, UNVERIFIED this session). Plan a manual iPhone smoke test.
- Byte budgets: size-limit with `@size-limit/file` and gzip/brotli limits in `package.json`, or a ~20-line Vite/rollup post-build script that walks `dist/assets` — both are cross-platform. `bundlesize` and `budgets.json` format for Lighthouse not verified this session.
- MPL-2.0 for axe is a dev-only dependency; no distribution concerns for a hobby app.

### Gaps
- `bundlesize` status, `lighthouse --budget-path` syntax, LHCI compatibility with Lighthouse 13 not verified.
- Whether Playwright WebKit needs `--with-deps webkit` vs plain `--with-deps`: docs confirm the generic form; `webkit`-only argument is the standard CLI syntax (UNVERIFIED in the fetched page).

## Japanese font subsetting

### Takeaway
`@fontsource/noto-sans-jp` 5.3.0 (OFL-1.1) ships Google's 120 numbered unicode-range slices per weight (about 2.77 MB total for weight 400 woff2, ~23 KB average) plus a separate single 1.0 MB "japanese" file; it is the lowest-effort cross-platform choice (pure npm). Self-subsetting tools (subfont, glyphhanger) were version-checked only.

### Cited Findings
- @fontsource/noto-sans-jp 5.3.0, OFL-1.1, unpacked 80 MB, 2,319 files; metadata: subsets cyrillic, japanese, latin, latin-ext, vietnamese; weights 100-900; font version v56, lastModified 2026-01-07 — [npm](https://registry.npmjs.org/@fontsource/noto-sans-jp/latest), [fontsource metadata](https://raw.githubusercontent.com/fontsource/font-files/main/fonts/google/noto-sans-jp/metadata.json)
- File listing via jsDelivr for weight 400 woff2: 120 numbered slices (`noto-sans-jp-0-400-normal.woff2` ... ) totalling 2,765,500 bytes (avg ~23 KB); plus `japanese` 1,017,536 B, `latin` 13,072 B, `latin-ext` 4,460 B, `cyrillic` 5,304 B, `vietnamese` 4,688 B. Whole package woff2 total (all weights) 34 MB — [jsDelivr package listing](https://data.jsdelivr.com/v1/packages/npm/@fontsource/noto-sans-jp@5.3.0) (computed by me from the file list)
- @fontsource-variable/noto-sans-jp 5.3.0, OFL-1.1: 120 numbered variable slices totalling 5,171,168 B (~5.2 MB); latin variable 24,840 B — [jsDelivr listing](https://data.jsdelivr.com/v1/packages/npm/@fontsource-variable/noto-sans-jp@5.3.0), [npm](https://registry.npmjs.org/@fontsource-variable/noto-sans-jp/latest)
- subfont 7.3.0 (MIT), glyphhanger 6.0.0 (MIT) — [npm subfont](https://registry.npmjs.org/subfont/latest), [npm glyphhanger](https://registry.npmjs.org/glyphhanger/latest)

### Inferences
- Because browsers only download slices whose unicode-range is used, runtime transfer is small online; for offline use, either precache all 120 slices (~2.8 MB for one weight) or generate a custom subset of only JLPT N5-N1 kanji + kana (~2,000-3,000 glyphs, expected a few hundred KB; not measured).
- The only fully cross-platform Node-only option without Python is Fontsource slices; fonttools `pyftsubset` needs Python (can be a CI-only step); glyphhanger/subfont dependency requirements (puppeteer/Python) are UNVERIFIED here.
- Use one weight (400 or 500) to stay within budget; avoid the variable font (5.2 MB).

### Gaps
- No size measurement of a custom JLPT-only subset; no verification of subfont/glyphhanger runtime dependencies or Windows behavior.

## Vercel: SPA deploy, vercel.json, Hobby limits, Git integration, GitHub Actions

### Takeaway
A Vite SPA deploys with zero config plus a one-line SPA rewrite; Hobby is free but non-commercial only and cannot connect repos owned by a GitHub organization. Functions on Hobby: 300 s, 2 GB, 4.5 MB body, 1M invocations/month.

### Cited Findings
- SPA fallback rewrite from docs: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`; docs state "precedence is given to the filesystem prior to rewrites" (so real static files and /api functions are served first) — [vercel.json docs](https://vercel.com/docs/project-configuration/vercel-json)
- Header example from docs: `{"source": "/assets/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31556952, immutable"}]}`; `headers` is the supported way (older `routes` also works) — [vercel.json docs](https://vercel.com/docs/project-configuration/vercel-json)
- vercel.json supports `functions` with `maxDuration` (integer seconds up to plan max), `headers`, `rewrites`, `cleanUrls`, `buildCommand`, `outputDirectory`, `regions`; vercel.ts / vercel.toml are alternatives (only one config file per project) — [project configuration](https://vercel.com/docs/project-configuration)
- Hobby general limits: 100 deployments/day, 100 builds/hour, 45 min build time, 100 MB static upload via CLI, 200 projects, 1 concurrent build, 25 projects per Git repo, 50 domains per project, runtime logs retained 1 hour — [limits](https://vercel.com/docs/limits)
- Hobby with Fluid compute: function max duration 300 s (default and max), 2 GB / 1 vCPU, 250 MB uncompressed bundle, request/response body 4.5 MB, 1,024 file descriptors; legacy non-Fluid projects (pre 2025-04-23) 10 s default / 60 s max — [function limits](https://vercel.com/docs/functions/limitations), [limits](https://vercel.com/docs/limits)
- Hobby usage guidelines: Fast Data Transfer first 100 GB, function invocations first 1,000,000, Fast Origin Transfer 10 GB, Active CPU 4 hours, provisioned memory 360 GB-hrs — [fair use](https://vercel.com/docs/limits/fair-use-guidelines)
- Hobby is "non-commercial personal use only"; donations do not count as commercial; ads, payments, affiliate links do — [fair use](https://vercel.com/docs/limits/fair-use-guidelines)
- Hobby teams cannot connect projects to Git repositories owned by Git organizations — [limits](https://vercel.com/docs/limits)
- GitHub import requires being the repo Owner for personal-account repos (a Collaborator cannot create the project); Vercel deploys every push (previews per branch/PR, production on the production branch) — [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
- Vercel GitHub app permissions include Administration, Checks, Contents, Deployments, Pull requests, Issues, Metadata (read), Webhooks, Commit statuses (read/write); org Members (read); user email (read) — [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
- GitHub Actions alternative: install CLI (`npm i -g vercel@latest`), `vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}`, `vercel build --prod`, `vercel deploy --prebuilt --prod`; separate workflows for preview vs production — [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)

### Inferences
- A Vite SPA is auto-detected (framework preset Vite, output `dist`); not verified from fetched pages but standard. UNVERIFIED.
- Phone-only setup steps (install Vercel GitHub app, import repo on vercel.com) are standard web flows: sign in with GitHub, Add New > Project > pick repo > Deploy. The docs fetched did not give a mobile-specific walkthrough, so I cannot confirm the mobile UX. UNVERIFIED.
- For `sw.js`: `Cache-Control: public, max-age=0, must-revalidate` is the usual rule so updates are noticed; also apply to `index.html`. Not from fetched Vercel docs (UNVERIFIED), but the documented header mechanism supports it. `Service-Worker-Allowed` is only needed if the SW lives outside its scope root.
- For the GitHub Actions route the needed secrets are VERCEL_TOKEN (documented) plus VERCEL_ORG_ID and VERCEL_PROJECT_ID (found in `.vercel/project.json` after `vercel link`); the latter two are from my background knowledge and not in the fetched page — UNVERIFIED. Since Git integration already deploys on push, Actions are only needed for custom CI/gating.
- A pure personal hobby app fits Hobby limits easily.

### Gaps
- No fetched example of a CSP header in vercel.json (mechanism is `headers` with `Content-Security-Policy` key).
- No verification of the exact dashboard click path for importing from a phone.

## Vercel storage and least-setup KV sync store

### Takeaway
Least setup for a tiny per-user sync blob: Vercel Blob (private store, one JSON blob per sync key, optimistic concurrency via ETag/`ifMatch`). It is native, free on Hobby within limits, and the SDK authenticates by OIDC automatically once the store is connected. Marketplace Upstash Redis/Neon are the alternatives with true KV/SQL semantics but an extra provider integration.

### Cited Findings
- Vercel Blob is available on all plans; stores are private or public (cannot be changed after creation); private reads go through your Function via `get()`; sizes up to 5 TB per file — [Blob docs](https://vercel.com/docs/vercel-blob)
- Connect a store: store's Projects tab > Connect to Project > pick project and environments. This adds `BLOB_STORE_ID`, `VERCEL_OIDC_TOKEN`, `BLOB_WEBHOOK_PUBLIC_KEY`; the SDK uses OIDC by default. `BLOB_READ_WRITE_TOKEN` (long-lived) is added when you create a store and is needed only outside Vercel/CI or for client uploads (`handleUpload`). Locally run `vercel env pull` — [Blob docs](https://vercel.com/docs/vercel-blob)
- Overwrites need `allowOverwrite: true`; conditional writes via `ifMatch: etag` throw `BlobPreconditionFailedError` on conflict; conditional reads via `ifNoneMatch` (304); changes may take up to 60 s to propagate through the CDN cache; private blobs can read the latest with `useCache: false` — [Blob docs](https://vercel.com/docs/vercel-blob)
- Hobby Blob included usage: 1 GB storage/month, 10,000 simple operations, 2,000 advanced operations (put/copy/list/create store), 10 GB data transfer. Over the limit you are not charged but lose access to Blob until 30 days pass — [Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- Hobby Blob rate limits: Blob pricing page says 1,200 simple/min and 900 advanced/min; the general limits page lists 1,200 simple/min and 1,500 advanced/min for Hobby. These two Vercel pages conflict — [Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing), [limits](https://vercel.com/docs/limits)
- `@vercel/blob` 2.8.1 (published 2026-10-06), Apache-2.0, Node >=20 — [npm](https://registry.npmjs.org/@vercel/blob/latest)
- Marketplace storage: available on all plans; Postgres via Neon/Supabase/AWS Aurora/Prisma Postgres, Redis via Redis or Upstash; integrations "automatically inject credentials into your projects as environment variables". Dashboard flow: Marketplace > Install > pick plan > configure (name/region) > connect to project. CLI: `vercel install neon --name my-database --plan free -e production -e preview` provisions, connects to the linked project, and runs `vercel env pull`. Default connection scope is production, preview, development — [Marketplace storage](https://vercel.com/docs/marketplace-storage)
- @upstash/redis 1.39.0 (MIT), @neondatabase/serverless 1.2.0 (MIT) — [npm](https://registry.npmjs.org/@upstash/redis/latest), [npm](https://registry.npmjs.org/@neondatabase/serverless/latest)

### Inferences
- Blob's 2,000 advanced ops/month on Hobby means ~66 `put`s/day: sync writes must be debounced/batched (e.g., one write per session end), and avoid `list()`. This is tight but fine for one person. Redis (Upstash) has per-command quotas I did not verify.
- Blob as KV: key = hash of sync key / user id, value = one JSON snapshot; use `ifMatch` for last-writer detection and merge in the client (Dexie export format or custom CRDT-ish merge).
- Whether an Upstash free plan is offered via the Hobby flow was not confirmed (the doc example shows `--plan free` for Neon).

### Gaps
- Upstash free-tier numbers, Neon free-tier limits not fetched.
- Whether "Vercel KV" (legacy) is fully removed: the docs simply list Redis/Upstash for KV; no explicit sunset statement fetched.

## Passwordless auth for optional sync: WebAuthn passkeys vs device-generated sync key

### Takeaway
Passkeys via @simplewebauthn/server 14.0.3 + browser 14.0.0 are doable on Vercel but need persistent server storage (credential id, public key, counter, temporary challenge) and a fixed rpID/origin; for a one-person hobby app, a generated high-entropy sync key (device secret, pairing by QR/code) needs far less infrastructure.

### Cited Findings
- @simplewebauthn/server 14.0.3 (published 2026-09-25), MIT, Node >=20 per npm engines (docs state Node 22.x LTS+); @simplewebauthn/browser 14.0.0, MIT, bundlephobia 13 KB min / 3.8 KB gzip; server weekly downloads 6.35M — [npm server](https://registry.npmjs.org/@simplewebauthn/server/latest), [npm browser](https://registry.npmjs.org/@simplewebauthn/browser/latest), [bundlephobia](https://bundlephobia.com/api/size?package=@simplewebauthn/browser@14.0.0)
- Server must define `rpName`, `rpID` (domain), `origin` (full URL, no trailing slash); `generateRegistrationOptions` -> `verifyRegistrationResponse`; persist credential `id` (TEXT index), `publicKey` (bytes), `counter`, and temporarily the challenge; Ed25519 (-8) may need excluding on older Node — [simplewebauthn.dev server](https://simplewebauthn.dev/docs/packages/server)
- Search for passkeys in iOS standalone PWAs returned no specific issue documentation (only generic hanko/ory/corbado material) — [search results](https://www.hanko.io/blog/how-to-support-apple-icloud-passkeys-with-webauthn)

### Inferences
- Passkey pitfalls for this app: rpID is tied to the domain (changing from `*.vercel.app` to a custom domain invalidates credentials); challenge must be stored between two serverless invocations (needs Blob/Redis); counters/credentials stored in the same sync store. Behavior of passkeys inside an iOS Home Screen web app was NOT verified.
- Sync-key approach: client generates 128-bit+ random key (e.g., 20-24 base32 chars or 12 words), derives (HKDF) a storage id plus an encryption key; server stores only ciphertext under hash(id) in Blob, so no accounts, no DB, and the server can't read data. Trade-off: losing the key means losing data (no recovery); pairing a second device by QR or typed code. Considered more suitable for single-user.
- Rate limiting/abuse: unauthenticated writes need basic limits since Hobby quotas are shared; sync key acts as bearer token.

### Gaps
- No evidence collected on iOS standalone PWA passkey behavior, nor on Vercel serverless rate-limit tooling.

## Content Security Policy for a WebGL PWA with a service worker

### Takeaway
three.js/R3F itself should not need `unsafe-eval`; you typically need `worker-src 'self' blob:` (if DRACO/KTX2/Basis loaders spawn blob workers), `img-src 'self' data: blob:`, and `'wasm-unsafe-eval'` only if you load WASM (e.g., DRACO, Rapier). Source quality here is thin (forum + search snippets).

### Cited Findings
- Using three.js loaders that create workers from blob URLs (e.g., DRACOLoader) triggers CSP violations unless `worker-src` explicitly allows `blob:` (otherwise falls back to `default-src`); `'self'` does not match `blob:`; use `worker-src 'self' blob:` — [three.js discourse](https://discourse.threejs.org/t/how-to-set-content-security-policy-for-usegltfs/51398)
- WebAssembly needs `'wasm-unsafe-eval'` in `script-src`; a search-result source claims Safari requires `unsafe-eval` for correct WebAssembly operation (older Safari behavior; treat as UNVERIFIED for current iOS) — [search results](https://next.centralcsp.com/en/blog/csp-blob-scheme)
- Recommended `img-src 'self' blob: data:` for blob/data textures — [search results](https://discourse.threejs.org/t/how-to-set-content-security-policy-for-usegltfs/51398)

### Inferences
- Starter policy (UNVERIFIED in a browser): `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`. Add `'wasm-unsafe-eval'` only if you ship WASM. `style-src 'unsafe-inline'` may be needed because React/Motion set inline styles via attributes (CSSOM `style.x =` assignments are not blocked, but `style=""` attributes in HTML are) — to be tested.
- Service worker registration is governed by `worker-src` (fallback child-src, script-src, default-src); `'self'` suffices for `/sw.js`.
- Deliver via the vercel.json `headers` array.

### Gaps
- No official three.js CSP guidance found; need to test in Chrome and iOS Safari.

## Handwriting / stroke-order tracing

### Takeaway
hanzi-writer 3.7.3 (MIT) has a ready quiz mode and a pluggable `charDataLoader`, but its Japanese data package `hanzi-writer-data-jp` 0.0.2 is experimental (last published 2020-12), derived from Make Me a Hanzi/animCJK, and licensed Arphic PL / LGPL. KanjiVG (CC BY-SA 3.0) is the usual alternative for stroke paths. I found no maintained "kanjicanvas" npm package.

### Cited Findings
- hanzi-writer 3.7.3, MIT, bundlephobia 35.7 KB min / 10.6 KB gzip; weekly downloads only 20,743 — [npm](https://registry.npmjs.org/hanzi-writer/latest), [bundlephobia](https://bundlephobia.com/api/size?package=hanzi-writer@3.7.3), [npm API](https://api.npmjs.org/downloads/point/last-week/hanzi-writer)
- Quiz API: `quiz()` with callbacks `onMistake`, `onCorrectStroke`, `onComplete`; options `showHintAfterMisses` (default 3), `acceptBackwardsStrokes` (default false), `leniency` (default 1.0), `markStrokeCorrectAfterMisses`. Character data format: `strokes` (array of SVG path strings) and `medians` (point data for grading); load via `charDataLoader` (can be local/offline). Library is MIT; data derives from Arphic Public License, distributed under LGPL/MIT terms via hanzi-writer-data — [hanziwriter.org docs](https://hanziwriter.org/docs.html)
- hanzi-writer-data 2.0.1: license field "SEE LICENSE IN ARPHICPL.TXT", unpacked 32 MB — [npm](https://registry.npmjs.org/hanzi-writer-data/latest)
- hanzi-writer-data-jp 0.0.2: "derived from Make Me a Hanzi and animCJK", license "SEE LICENSE IN license FOLDER", last published 2020-12-15; repo says dual Arphic Public License + LGPL v3+, "currently experimental", no radicals, no capped strokes, kana coverage and Japanese variant forms not stated; unpacked size 47 KB (so small; character count not stated) — [npm](https://registry.npmjs.org/hanzi-writer-data-jp/latest), [GitHub](https://github.com/chanind/hanzi-writer-data-jp)
- KanjiVG: copyright Ulrich Apel, CC BY-SA 3.0 (attribution + share-alike); SVG per kanji with `kvg:` attributes for stroke order, radicals, elements; releases include main, complete (with variants), stripped, and legacy XML — [KanjiVG GitHub](https://github.com/KanjiVG/kanjivg)
- kanjicanvas: `npm` registry returned an error for package `kanjicanvas` (no such package) — [registry query](https://registry.npmjs.org/kanjicanvas/latest)

### Inferences
- Approach: convert KanjiVG strokes (via SVG path sampling) to point sequences and write a small own matcher (resample to N points, normalize, compare each user stroke against the expected next stroke with DTW/Fréchet or $1/$P-style distance plus start/end direction checks). That avoids the 20K-download, 5-year-stale Japanese data pipeline; hanzi-writer's quiz can also accept custom data in its format, so converting KanjiVG paths into `{strokes, medians}` is a possible hybrid (UNVERIFIED feasibility).
- License impact: CC BY-SA 3.0 means attribution and share-alike for the data/derivatives, not the app code (generally; legal interpretation not verified); LGPL/Arphic for hanzi-writer-data-jp requires notices.

### Gaps
- No evidence on KanjiVG kanji count, kana strokes coverage, or an existing KanjiVG->hanzi-writer converter.
- DTW/Fréchet/$P library options on npm not researched.

## Vite build and cross-platform npm scripts (Windows)

### Takeaway
Use cross-env 10.1.0, rimraf 6.1.3, shx 0.4.0, npm-run-all2 9.0.3 or concurrently 10.0.5; all are current and MIT/BlueOak. Prefer Node scripts (`node scripts/x.mjs`) over shell for anything complex.

### Cited Findings
- cross-env 10.1.0 (MIT), rimraf 6.1.3 (BlueOak-1.0.0), shx 0.4.0 (MIT), npm-run-all2 9.0.3 (MIT), concurrently 10.0.5 (MIT) (checked 2026-10-06) — [cross-env](https://registry.npmjs.org/cross-env/latest), [rimraf](https://registry.npmjs.org/rimraf/latest), [shx](https://registry.npmjs.org/shx/latest), [npm-run-all2](https://registry.npmjs.org/npm-run-all2/latest), [concurrently](https://registry.npmjs.org/concurrently/latest)
- Node floors for the toolchain: vite-plugin-pwa 2.0.0 >=20.19; TanStack Router >=20.19; Vitest 5 ^22.12; react-router 8 >=22.22 — see npm links above.

### Inferences
- Pin Node 22 LTS (or 24) in `.nvmrc`/`engines`, `.node-version` for Vercel, and use `rimraf dist`, `cross-env NODE_ENV=...`, `run-p`/`run-s`; avoid `rm -rf`, `&&` chains with env prefixes, `$VAR` expansion. Not source-verified beyond versions.

### Gaps
- No docs fetched on these tools' Windows behavior; shx/rimraf maintenance status beyond latest publish dates not checked.
