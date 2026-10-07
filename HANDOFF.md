# Handoff

Kintsugi is built, tested and pushed to `main`. Two steps need you in the Vercel dashboard, a few taps each. Everything else runs on its own.

## 1. Put it online (needed once)

1. vercel.com → sign in with GitHub → Add New → Project → import `Carlob2499/LanguageApp`.
2. Leave the defaults (Vercel reads `vercel.json`: framework Vite, build `npm run build`, output `dist`). Deploy.
3. Every push to `main` then deploys automatically, and every pull request gets a preview URL.

The app works fully offline without anything else. Sync stays off and says so until step 2.

## 2. Switch on sync (optional)

1. Vercel project → Storage → Create → Blob → connect it to this project (all environments).
2. Redeploy once (Deployments → ⋯ → Redeploy) so the function sees `BLOB_READ_WRITE_TOKEN`.
3. Settings → Sync between devices → Turn on sync now reports "Synced". The free Blob tier is enough: the app uploads at most 60 snapshots a day per learner.

## 3. Check it on your phone

Work through REAL-DEVICE-CHECKLIST.md. The automated suite covers Chromium and WebKit, but install, audio voices, haptics-free gestures and iOS storage need a real device.

## Running it locally

```
npm ci
npm run dev          # http://localhost:5173
npm run verify       # typecheck, lint, format, unit, build, budgets, Lighthouse, e2e, placeholder scan
npm run data:update  # refresh the dictionaries (quarterly; a monthly GitHub Action also opens a PR)
```

Node 22 (see `.nvmrc`). WebKit e2e: `npx playwright install webkit` then `PW_WEBKIT=1 npm run test:e2e`.

## Where things are

- PLAN.md: the approved plan and research citations. PROGRESS.md: what was built, milestone by milestone, with the 50-entry data spot-check. CLAUDE.md: conventions and gotchas for whoever works on it next.
- Content comes only from licensed datasets through `scripts/data`, with `public/packs/ja/provenance.json` recording sources, versions, licences and transforms. The Sources screen (`/about`) shows every credit.
