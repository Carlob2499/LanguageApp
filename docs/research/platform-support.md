# Platform support for an installable PWA (as of 2026-10-06), iOS Safari first

NOTE FOR COORDINATOR: Plan mode was active during this run, so this file was written to the plan path instead of the requested path
(/tmp/claude-0/-home-user-LanguageApp/46bd9feb-75de-50ad-adda-3fe5906e701d/scratchpad/research_notes/JLPT PWA platform and content research/platform_support.md).
Copy it there when plan mode is off.

Current platform state (verified): Safari 27.0 / iOS 27 released 2026-09-14 ([Apple Safari 27 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes.md), "Released September 14, 2026 - 27.0 (20625.1.29)"). Safari 26.0 shipped 2025-09-15 ([Apple Safari 26 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md)). Latest 26.x seen on the WebKit blog: 26.6 (post dated 2026-07-27). Safari 27.0 features post dated 2026-09-17. Caveat on caniuse: it showed iOS Safari up to "27.2", i.e. it includes betas, so treat versions above 27.0 as pre-release. Caniuse pages carry no fixed date; they were fetched on 2026-10-06.

## Install flow on iOS Safari (Add to Home Screen, beforeinstallprompt, Safari 26, third-party browsers, EU)

### Takeaway
iOS has no `beforeinstallprompt` and no automatic install banner; installation is manual via the Share sheet. Since iOS/iPadOS 26 every site can be added and opens as a web app by default (an "Open as Web App" toggle), so a manifest is no longer required for standalone mode. Third-party browsers can offer Add to Home Screen (since 16.4); in the EU, Home Screen web apps were kept but always run on WebKit.

### Cited Findings
- Safari 26.0: "every site can be a web app on iOS and iPadOS"; "zero requirements for 'installability'"; a user can toggle "Open as Web App" when adding, regardless of a manifest. Release-note entry: "Added support for any website to become a web app on iOS or iPadOS" and a fix for the "Add to Home Screen" flow failing to load webpage data. — [WebKit Features in Safari 26.0 (2025-09-15)](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/); [Safari 26.0 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md)
- First announced in the WWDC25 beta post: "By default, every website added to the Home Screen opens as a web app." — [News from WWDC25 (2025-06-09)](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)
- If "Open as Web App" is switched off, the site opens as a Safari tab instead (secondary source, not primary) — [iThinkDiff, iOS 26 add to Home Screen (undated)](https://www.ithinkdiff.com/add-web-app-bookmark-iphone-home-screen-ios-26/)
- Third-party browsers can offer "Add to Home Screen" in the Share menu from iOS/iPadOS 16.4. — [WebKit Features in Safari 16.4 (2023-03-27)](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)
- firt.dev tracker (last updated 2023-06-06, stale): no install prompt/banner and no `beforeinstallprompt` on iOS; "App can be installed from non-Safari browsers: 16.4, if opted-in by the browser." — [firt.dev PWA on iOS](https://firt.dev/notes/pwa-ios/)
- EU: iOS 17.4 beta 2 first demoted Home Screen web apps to browser shortcuts. Apple then reversed: EU users can keep installing web apps, but they must use WebKit. — [The Register, 2024-03-02](https://www.theregister.com/2024/03/02/apple_reverses_pwa_decision/); [The Register, 2024-02-08](https://www.theregister.com/2024/02/08/apple_web_apps_eu/)
- Safari 27.0 notes (the part I read) contain no Web Apps / install changes. — [Safari 27 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes.md); [WebKit Features for Safari 27.0 (2026-09-17)](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)

### Inferences
- Rely on a manual install instruction UX (Share, then Add to Home Screen) for iOS; do not depend on an in-app install button. Keep a manifest anyway (name, icons, `display: standalone`) for deterministic behavior and for Android/desktop Chromium installability.
- An iOS 26 user can leave "Open as Web App" off, so detect standalone at runtime (`navigator.standalone`, `display-mode: standalone`) and degrade gracefully.

### Gaps
- Whether Safari 26/27 shows any proactive install affordance beyond the Share sheet: no primary source says so; unverified (none found).
- Current EU behavior on iOS 26/27 for third-party browsers: no 2026 source found; unverified.
- Chrome/Edge Android and desktop install flow (`beforeinstallprompt`, omnibox install) was not researched in this pass; unverified.

## Storage: persist(), 7-day ITP eviction, IndexedDB quota, estimate()

### Takeaway
In Safari 17+ quotas are a share of total disk (up to 60% per origin for browser apps, 15% for other apps; Home Screen web apps get the browser-app allowance). The 7-day script-writable storage cap applies to Safari tabs; Home Screen web apps have their own use counter and are not expected to be evicted. `persist()` exists, and WebKit grants it by heuristics (e.g., opened as a Home Screen web app).

### Cited Findings
- Safari 17.0 (iOS 17, macOS Sonoma): per-origin quota up to 60% of total disk for browser apps, up to 15% for other apps; overall up to 80% / 20%. Cross-origin frames get 10% of the main frame's origin quota. — [WebKit, Updates to Storage Policy (2023-08-10)](https://webkit.org/blog/14403/updates-to-storage-policy/)
- Home Screen web apps get the same quota allowances as browser apps. Eviction happens when over quota, under storage pressure, or when the site has not been interacted with for some time (ITP), in LRU order. — same source
- `StorageManager.persist()`: WebKit "currently grants a request based on heuristics like whether the website is opened as a Home Screen Web App." `estimate()` returns usage and quota, but there is no guarantee a site can store that much, so handle `QuotaExceededError`. — same source
- ITP 7-day cap: script-writable storage (IndexedDB, localStorage, media keys, sessionStorage, Service Worker registrations and caches) is deleted after seven days of Safari use without user interaction on the site. Home Screen web apps "are not part of Safari and thus have their own counter of days of use," which resets with actual use. — [WebKit, Full Third-Party Cookie Blocking and More (2020-03-24)](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- Support versions: persistent storage 15.2, storage quota API 17, OPFS 15.2, IndexedDB 8.0 (stale tracker, 2023-06-06). — [firt.dev](https://firt.dev/notes/pwa-ios/)
- MDN: `persist()` is Baseline "widely available since December 2021"; the browser may or may not honor it; not available in Web Workers. — [MDN StorageManager.persist](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
- Safari 27.0 fixes: IndexedDB returned a version-0 database after abort during the initial upgrade; IndexedDB transactions blocked while another page's transaction was suspended in the background; worker IDB connections recover after a network-process crash. — [Safari 27 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes.md)

### Inferences
- A Safari-tab user can lose all local data after 7 days idle; Home Screen install is the main mitigation. Pair with an export/backup or sync, and call `persist()` after install, but treat its result as advisory.

### Gaps
- Exact byte numbers for typical iPhones (the quota is a % of disk), and whether `persist()` returns true in a Safari tab in 2026: unverified. Whether the ITP cap text from 2020 is unchanged in 2026: no newer primary statement found.
- Whether the Safari 26 "every site is a web app" model changed the home-screen exemption: unverified.

## Service workers on iOS (cache caps, eviction, background, update checks, storage sharing)

### Takeaway
Service workers are supported in Safari and Home Screen web apps. Their registrations and caches fall under the same eviction rules as above. I found no primary source giving a hard Cache Storage size cap beyond the origin quota; background execution limits and whether Home Screen apps share storage with Safari tabs were not verified.

### Cited Findings
- Service Worker registrations and caches are included in the 7-day cap for Safari tab use. — [WebKit 2020-03-24](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- Safari 26.0 service worker fixes: ReadableStream cancel reliability, navigation preload with disk cache; automatic Service Worker inspection in Web Inspector. — [Safari 26.0 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md)
- Safari 26.6 (2026-07-27): service worker registrations with missing main or imported scripts are now automatically unregistered. — [WebKit Features for Safari 26.6](https://webkit.org/blog/18178/webkit-features-for-safari-26-6/)
- Safari 27.0: Service Worker static routing API (rules letting the browser bypass the service worker for some requests). — [Safari 27 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes.md); [News from WWDC26 (2026-06-08)](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/)

### Inferences
- Plan for a cold cache after eviction; ship app-shell precache and a versioned update flow. Test the 26.6 behavior (a missing script unregisters the worker) in your deploy process: do not delete old hashed assets before clients update.

### Gaps
- Whether Home Screen web apps share storage with Safari tabs on iOS: I did not verify with a primary source in this pass. WebKit's statements imply separate treatment (own counter), but this is unverified; do not assume shared data.
- Hard cache size caps, background sync / periodic sync (generally not supported on iOS; unverified here), update-check cadence: not found.

## Web Push, Notifications, Badging, Notification Triggers

### Takeaway
Web Push, Notifications and Badging work on iOS/iPadOS 16.4+ only for Home Screen web apps, triggered by a user gesture. Declarative Web Push (no service worker needed) arrived in iOS 18.4. Notification triggers: not verified.

### Cited Findings
- iOS/iPadOS 16.4: Web Push for Home Screen web apps only; permission request must come from direct user interaction; needs a service worker (at that time) and a manifest `display` of `standalone` or `fullscreen`; notifications integrate with Focus. — [WebKit, Web Push for Web Apps on iOS and iPadOS (2023-02-16)](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- Badging API (`setAppBadge`, `clearAppBadge`) arrived in 16.4; permission follows the notification permission. — [WebKit Features in Safari 16.4 (2023-03-27)](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)
- Declarative Web Push: testable on iOS/iPadOS 18.4; works without a service worker; the payload can carry an `app_badge` field for Home Screen web apps. — [WebKit, Meet Declarative Web Push (2025-03-27)](https://webkit.org/blog/16535/meet-declarative-web-push/); Safari 18.4 post [(2025-03-31)](https://webkit.org/blog/16574/webkit-features-in-safari-18-2/) also states it is available in iOS 18.4 for Home Screen web apps (note: the URL slug says 18-2 but the fetched content described 18.4)
- No Web Push/Badging changes noted in Safari 26.0, 27.0 or 26.6 notes that I read. — [26.0](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md), [27.0 features](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)

### Inferences
- For a study app, reminders via Web Push are viable only after install; a local, in-app reminder fallback is needed for Safari-tab users.

### Gaps
- Notification Triggers (TimestampTrigger / scheduled local notifications): no source found; treat as unsupported/unverified on Safari (it was never shipped in Chrome either, from memory; unverified).
- Behavior on Android Chrome and desktop: not researched.

## Vibration API and web haptics on iOS

### Takeaway
`navigator.vibrate` is not supported in any Safari version. The `<input type="checkbox" switch>` haptic trick worked from iOS 17.4 to 26.4 but was reportedly patched in iOS 26.5; do not rely on it.

### Cited Findings
- caniuse: Vibration API not supported in iOS Safari (all versions listed) or Safari desktop; Chrome for Android supported (listed 154). — [caniuse Vibration (fetched 2026-10-06)](https://caniuse.com/vibration)
- MDN marks the Vibration API as limited availability (not Baseline). — [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- Switch-checkbox trick: hidden `<label>` with `<input type="checkbox" switch>` clicked programmatically triggers the haptic engine. The `ios-haptics` library says it works on "ios 17.4 to 26.4, as apple patched it in ios 26.5." — [ios-haptics README](https://unpkg.com/ios-haptics@3.1.1/README.md); [azukiazusa.dev, Mar 4 2026](https://azukiazusa.dev/en/blog/ios-safari-web-haptics) (article calls it a hack that may stop working)
- WebKit bug 285120: haptic feedback for `switch` required user activation to prevent JS-driven vibration; marked RESOLVED FIXED on 2025-01-03 (Safari 18 on iOS 18). — [WebKit Bugzilla 285120](https://bugs.webkit.org/show_bug.cgi?id=285120)
- The switch attribute is Safari-only. — azukiazusa.dev above

### Inferences
- The trick needs a genuine user gesture to be reliable (from bug 285120) and is broken in 26.5+ per a third-party library note (the iOS 26.5 claim comes from library README only; no Apple primary source found). Make haptics a progressive enhancement: `navigator.vibrate?.()` on Android and nothing (or audio/visual feedback) on iOS.

### Gaps
- Primary confirmation of the iOS 26.5 patch: not found (unverified, secondary source only). Behavior on iOS 27: not found.

## View Transitions (same-document and cross-document)

### Takeaway
Same-document: Chrome/Edge 111+, Safari 18+ (macOS and iOS). Cross-document: Chrome/Edge 126+, Safari 18.2+ (macOS and iOS). Firefox 144 has same-document support; partial for cross-document.

### Cited Findings
- Same-document: Chrome 111+, Edge 111+, Safari desktop 18+, iOS Safari 18+, Firefox 144+. — [caniuse view-transitions (fetched 2026-10-06)](https://caniuse.com/view-transitions)
- Cross-document: Chrome 126+, Edge 126+, Safari 18.2+, iOS Safari 18.2+, Chrome Android listed 154, Firefox 144 partial. — [caniuse cross-document-view-transitions](https://caniuse.com/cross-document-view-transitions)
- Safari 18.2 added `view-transition-name: auto`; 18.4 added `match-element` (the Safari 18.4 post as fetched). — [WebKit Features in Safari 18.4 (2025-03-31)](https://webkit.org/blog/16574/webkit-features-in-safari-18-2/)
- Safari 26.0 fixed a canvas element disappearing for one frame during a view transition. — [Safari 26.0 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md)

### Inferences
- Safe to use with feature detection (`document.startViewTransition`); `prefers-reduced-motion` handling is still the developer's job.

### Gaps
- Exact introduction version of cross-document in Safari: caniuse says 18.2; I did not confirm via the WebKit 18.2 post itself.

## Scroll-driven animations (animation-timeline)

### Takeaway
Shipped in Safari 26.0 (macOS and iOS); Chrome/Edge have had it since 115 (Chrome version from memory; unverified in this pass).

### Cited Findings
- Safari 26.0: "Added support for Scroll-driven Animations." — [Safari 26.0 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md); `animation-timeline: view()` and `animation-range` called out in [WebKit Features in Safari 26.0 (2025-09-15)](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- Fixed in 26.0: scroll-driven animations on pages using requestAnimationFrame after back-navigation. — Safari 26.0 release notes

### Inferences
- Use `@supports (animation-timeline: scroll())` and keep content usable without it; iOS 18 users have no support.

### Gaps
- caniuse page fetch returned no version table; Chromium version unverified here.

## WebGPU and WebGL2

### Takeaway
WebGPU shipped by default in Safari 26.0 on macOS, iOS, iPadOS and visionOS. Chrome/Edge 113+. WebGL2 baseline: not re-verified in this pass.

### Cited Findings
- Safari 26.0: "Added support for WebGPU" (WGSL, compute) on all Apple platforms, with HDR WebGPU canvas. — [Safari 26.0 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md); [WebKit 26.0 features](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- caniuse: Chrome/Edge 113+, Safari macOS 26.0 (marked partial), iOS Safari 26.0+, Samsung 24+, Firefox disabled by default. — [caniuse webgpu (fetched 2026-10-06)](https://caniuse.com/webgpu)
- Frameworks reported working with Safari 26: Babylon.js, Three.js, Unity, PlayCanvas, Transformers.js, ONNX Runtime. — WebKit 26.0 features post

### Inferences
- iOS 18 devices (still in use) have no WebGPU; keep a Canvas2D/WebGL fallback.

### Gaps
- WebGL2 (Safari 15+ from memory) not verified here; unverified.

## Viewport units, safe-area, viewport-fit=cover, iOS 26 bottom bar

### Takeaway
`dvh/svh/lvh` and `env(safe-area-inset-*)` need `viewport-fit=cover`. iOS 26 Safari's see-through bars introduced fixed-position and tinting quirks; some were fixed in 26.1 betas; behavior in installed web apps was also reported buggy.

### Cited Findings
- To get `env(safe-area-inset-bottom)`, the viewport meta must include `viewport-fit=cover`. iOS 26 dropped `theme-color` tinting; Safari derives chrome tint from the body background, and fixed-position elements (modals) can override it. — [Ben Frain (2025-11-16)](https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/)
- Reports of `<meta name="viewport">` / `viewport-fit=cover` / `height=device-height` misbehaving after iOS 26, and of viewport miscalculating the bottom area in standalone mode, with a blank gap after the keyboard closes. Safari 26.1 beta reportedly fixed a bottom gap with viewport-sized fixed containers. — search-result summary of [Apple forums thread 798672](https://developer.apple.com/forums/thread/798672), [WebKit bug 300965](https://bugs.webkit.org/show_bug.cgi?id=300965) (I did not open these threads; secondary reading only)
- Safari 26.0 fixed `lvh`/`vh` being sized to the small viewport in SFSafariViewController. — [Safari 26.0 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md)

### Inferences
- Design with `100dvh` + `env(safe-area-inset-*)` and test on a real iOS 26/27 device in both Safari and standalone; avoid full-viewport fixed overlays with a different background color at the page edges.

### Gaps
- Official Apple doc on the iOS 26 bottom bar; dvh/svh/lvh support versions (dvh in Safari 15.4 from memory; unverified here); iOS 27 changes: not found.

## Web Speech: speechSynthesis with ja-JP

### Takeaway
Known, longstanding problems: `getVoices()` can be empty initially (listen for `voiceschanged`), may list only low-quality voices, and has had ja-JP regressions. Needs a user gesture to start audio. Not verified for Home Screen web apps specifically.

### Cited Findings
- WebKit bug 290497 (reported 2025-03-26, Safari 18, status NEW): `getVoices()` lists only pre-installed voices, not ones downloaded in Settings; natural voices unavailable. — [WebKit Bugzilla 290497](https://bugs.webkit.org/show_bug.cgi?id=290497)
- Bug 250665 (search summary): Kyoko (ja-JP) no longer listed since iOS 16.0.2; in iOS 18 only low-quality "Eloquence" voices listed; enabling VoiceOver reportedly sometimes helps. — search result for [WebKit Bugzilla 250665](https://bugs.webkit.org/show_bug.cgi?id=250665) (not opened by me; unverified in detail)
- Historical: empty voice `name` on iOS 14, fixed in 14.2. — [WebKit Bugzilla 216684](https://bugs.webkit.org/show_bug.cgi?id=216684)
- Safari 26.0: fixed pending utterances not receiving an error event when speech is cancelled; SpeechRecognition limited to secure contexts. — [Safari 26.0 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md)

### Inferences
- Implement: speak only from a click/tap handler, populate voices on `voiceschanged` plus a retry, pick by `lang` starting `ja` and fall back to setting `utterance.lang = 'ja-JP'` without a voice, and offer pre-recorded audio as a fallback for key content.

### Gaps
- Whether the user-gesture requirement and empty-voices bug behave identically in standalone web apps; whether 26.x/27 fixed ja-JP voice listing: not verified.

## WebAuthn / passkeys

### Takeaway
Passkeys work in Safari and iCloud Keychain syncs them across Apple devices. In Home Screen web apps they work but with reported bugs. Safari 26 added the WebAuthn Signal API.

### Cited Findings
- Safari 26.0: "Added support for the WebAuthn Signal API." — [Safari 26.0 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md)
- Apple Developer Forums report passkey login problems (double prompts, stuck login) when login pages are launched from Home Screen shortcuts. — [Apple forums thread 815784](https://developer.apple.com/forums/thread/815784) (search-result summary; not opened)
- Reported regression: `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` returns false in non-Safari browsers on iOS 26.2 and 26.2.1. — [Apple forums thread 813927](https://developer.apple.com/forums/thread/813927) (search-result summary; not opened)
- Third-party summary: PWAs launched from the Home Screen can create passkeys. — [Progressier](https://progressier.com/pwa-capabilities/biometric-authentication-with-passkeys) (vendor blog, undated)

### Inferences
- Passwordless sync login via passkeys is feasible; keep a second recovery path (email magic link or recovery code) since standalone-mode bugs exist, and make sure the passkey RP ID stays on one origin.

### Gaps
- Primary confirmation of Home Screen web app passkey behavior on iOS 26/27 and whether the forum bugs were fixed: not verified.

## Wake Lock, Web Share, File System Access / export, share-sheet import

### Takeaway
Wake Lock: Safari 16.4+, and working in Home Screen web apps from iOS 18.4. Web Share: Safari 12.1/iOS 12.2+, Chrome 128+ desktop. `showSaveFilePicker` is not available in Safari or Chrome Android; use Web Share with files or a download link as fallback. Share-sheet import (Web Share Target) on iOS: not verified.

### Cited Findings
- Screen Wake Lock: Safari desktop and iOS 16.4+, Chrome 85+, Edge 90+, Firefox 126+. — [caniuse wake-lock (fetched 2026-10-06)](https://caniuse.com/wake-lock); introduced in iOS 16.4 per [WebKit 16.4](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/)
- Safari 18.4 added Screen Wake Lock support for Home Screen web apps (implying it was not working there before). — [WebKit Features in Safari 18.4 (2025-03-31)](https://webkit.org/blog/16574/webkit-features-in-safari-18-2/)
- Web Share: Safari 12.1, iOS 12.2+, Chrome 128+ (desktop), Edge 95+, Chrome Android listed, Firefox desktop none. — [caniuse web-share](https://caniuse.com/web-share)
- File System Access API: Chrome/Edge 105+ desktop; not in Safari (desktop or iOS), not in Chrome Android, Firefox opposes. — [caniuse native-filesystem-api](https://caniuse.com/native-filesystem-api)
- Safari 26.0: "Added support for the File System WritableStream API." (OPFS-related; not a save picker). — [Safari 26.0 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-26-release-notes.md)

### Inferences
- Export: feature-detect `showSaveFilePicker`; else `navigator.canShare({files})` + `navigator.share({files})` on iOS; else `<a download>` blob. Import: `<input type="file">` is the reliable path on iOS.

### Gaps
- Web Share Target (manifest `share_target`) on iOS: not found/verified; I believe not supported but this is unverified. Whether `<a download>` works well in standalone iOS web apps: not verified.

## Pointer events for finger handwriting (pressure, coalesced events)

### Takeaway
`getCoalescedEvents` landed in Safari 18.2 (macOS and iOS). Finger touch gives no real pressure: `pressure` is 0.5 while active and 0 otherwise; real values require Apple Pencil/stylus.

### Cited Findings
- `PointerEvent.getCoalescedEvents`: Chrome 58+, Firefox 59+, Edge 79+, Safari 18.2+; not supported on Safari before 18.2. — [caniuse (fetched 2026-10-06)](https://caniuse.com/mdn-api_pointerevent_getcoalescedevents)
- Touch `pressure` = 0.5 when active, 0 otherwise; Apple Pencil can provide the full 0-1 range. — [MDN PointerEvent.pressure](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pressure)
- Safari 27.0: fixed `preventDefault()` on `pointerdown` to suppress `mouseup` on iOS. — [Safari 27 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes.md)

### Inferences
- Simulate stroke width from velocity for finger input; use `touch-action: none` on the canvas; use coalesced events where present, with a fallback to plain `pointermove`.

### Gaps
- `Touch.force` / `webkitForce` on iPhone for finger: not verified; iOS 18 behavior of `touch-action` quirks in standalone mode not researched.

## Source coverage notes
- Fetched Apple release notes pages for Safari 26.0 (full) and Safari 27.0 (first ~100k chars of ~118k; the tail was not read). Safari 26.1 to 26.5 release notes were not read. Possible relevant items there are therefore unverified.
- Chrome Android/desktop Chrome/Edge/Safari-desktop secondary coverage is limited to caniuse values above; "Chrome for Android 154" values in caniuse appear to mean current Chrome.
