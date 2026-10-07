# Motion graphics in pure JavaScript: research for Kintsugi

Date: 2026-10-07. Versions from the npm registry (registry.npmjs.org; npmjs.com pages return 403 to our fetcher). Gzip sizes from Bundlephobia (whole package entry, not tree-shaken) unless noted. Items marked (inference) are my reasoning, not a cited fact; verify them in the app.

## 1. Library comparison

| Name | Version | Gzip | Licence | CSP (no eval) | iOS notes | URL |
|---|---|---|---|---|---|---|
| Motion (motion/react) | 14.0.0 | `animate` mini 2.3 kB (WAAPI only); hybrid `animate` ~17-18 kB (sequences, motion values, SVG path, springs); `m`+LazyMotion 4.6 kB + 15 kB (domAnimation) | MIT | Yes (no eval found; CSSOM styles) | WAAPI runs on compositor for transform/opacity; hybrid is JS-driven | [npm](https://registry.npmjs.org/motion/latest), [animate](https://motion.dev/docs/animate), [bundle](https://motion.dev/docs/react-reduce-bundle-size) |
| GSAP | 3.15.0 | 27.4 kB core ([Bundlephobia](https://bundlephobia.com/package/gsap@3.15.0)); plugins extra | "Standard no-charge licence": free incl. commercial; forbids use inside no-code visual animation builders that compete with Webflow | No eval known; inline-style caveat below | Mature; JS-driven (rAF) so throttled in Low Power Mode like any rAF code | [pricing](https://gsap.com/pricing/), [licence](https://gsap.com/standard-license), [3.13 post](https://gsap.com/blog/3-13/), [Webflow](https://webflow.com/blog/gsap-becomes-free) |
| anime.js | 4.5.0 | 40.3 kB whole package; tree-shaken: JS engine ~10 kB, WAAPI ~3 kB (per third-party docs summary) | MIT | Yes (no eval found) | WAAPI mode compositor-accelerated; timeline needs JS engine | [npm](https://registry.npmjs.org/animejs/latest), [install](https://animejs.com/documentation/getting-started/installation), [summary](https://www.mintlify.com/juliangarnier/anime/installation) |
| Theatre.js core | 0.7.2 | ~20 kB (reported) | Core Apache-2.0; Studio AGPL-3.0 (dev only) | Probably fine (not verified) | Keyframes as JSON, good for scripted scenes; editor is a desktop-style UI | [npm](https://registry.npmjs.org/@theatre/core/latest), [search summary](https://npmjs.com/package/@theatre/studio) |
| lottie-web | 5.13.0 | 76.8 kB (light build ~51 kB) | MIT | Full build uses eval; needs light/CSP-safe build | SVG renderer is CPU-heavy on big comps | [Bundlephobia](https://bundlephobia.com/package/lottie-web@5.13.0), [depscope](https://depscope.dev/pkg/npm/lottie-web), [issue](https://github.com/airbnb/lottie-web/issues/2927) |
| dotLottie web | 0.81.0 | 33 kB JS + WASM | MIT | Needs WASM: `wasm-unsafe-eval` (docs say may need `unsafe-eval`), self-host wasm via Vite `?url` | Canvas renderer | [Bundlephobia](https://bundlephobia.com/package/@lottiefiles/dotlottie-web@0.81.0), [CSP guide](https://github.com/LottieFiles/dotlottie-web/wiki/CSP-and-WASM-Self%E2%80%90Hosting-Guide) |
| Rive canvas-lite | 2.44.0 | WASM 222 kB brotli (707 kB raw) + JS; full canvas 567 kB | MIT runtime; needs .riv files from the Rive editor | Needs `wasm-unsafe-eval` | Canvas/WebGL; heavy for our budget | [sizes](https://rive.app/docs/runtimes/runtime-sizes.md), [FAQ](https://rive.app/docs/runtimes/web/faq.md) |
| perfect-freehand | 1.2.3 | 2.0 kB | MIT | Yes | Pure maths | [Bundlephobia](https://bundlephobia.com/package/perfect-freehand@1.2.3), [docs](https://docsearch.algolia.com/mcp/docs/repo/steveruizok/perfect-freehand) |
| ZzFX | 1.4.0 | 1.3 kB (Micro ~880 B) | MIT | Yes | WebAudio | [Bundlephobia](https://bundlephobia.com/package/zzfx@1.4.0), [npm](https://npmjs.com/package/zzfx) |
| Tone.js | 15.1.22 | ~75 kB | MIT | Yes | Overkill for UI sounds | [depscope](https://depscope.dev/pkg/npm/tone) |
| OGL (WebGL helper) | 1.0.11 | 34 kB | Unlicense | Yes | Alternative to three for one shader | [Bundlephobia](https://bundlephobia.com/package/ogl@1.0.11) |

GSAP verification: the pricing page states GSAP is 100% free thanks to Webflow, covering SplitText, MorphSVG, DrawSVG, ScrambleText, Flip ([pricing](https://gsap.com/pricing/)). npm `gsap` reports the licence as "Standard 'no charge' license" ([registry](https://registry.npmjs.org/gsap/latest)). The licence bans use in tools that let users build visual animations without code, which does not apply to us ([licence](https://gsap.com/standard-license)). SplitText 3.13+ is smaller, has `mask`, `autoSplit`, and adds aria-label/aria-hidden automatically ([docs](https://gsap.com/docs/v3/Plugins/SplitText/)). The licence is not MIT: it is proprietary-but-free and Webflow can update terms with notice (same licence page).

Lottie and Rive need authored assets. We cannot ship licensed After Effects files, and generating Lottie JSON or .riv by script is more work than writing the scenes directly in code. Not recommended.

CSP note: `style-src` also governs styles set in script. Setting `style.cssText` or `setAttribute("style")` is blocked; per-property CSSOM writes are not ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr), [CSP examples](https://content-security-policy.com/examples/allow-inline-style/)). (Inference) GSAP and anime.js mostly write per property, but test any `cssText` path in the production build with our real CSP before adopting either.

## 2. Recommended stack

1. Motion 14 stays the sequencer. Keep React components on `m` + `LazyMotion` (4.6 kB + features) and put scenes in lazy chunks that import hybrid `animate` (~18 kB) for `at`-offset sequences, springs, stagger and `pathLength` drawing ([animate](https://motion.dev/docs/animate)). The mini 2.3 kB `animate` suits small UI feedback in the initial chunk ([bundle](https://motion.dev/docs/react-reduce-bundle-size)). Rationale: already installed, MIT, one reduced-motion model.
2. Hand-written canvas 2D / WebGL (via the existing lazy three, or one raw fragment shader) for ink, paper and particles. No library is needed and nothing is added to the initial chunk.
3. perfect-freehand (2 kB, lazy) to build variable-width brush outlines from the pack's stroke points.
4. Hand-written WebAudio synths. ZzFX (1.3 kB) is an acceptable shortcut for percussive hits; skip Tone.js.
5. Native View Transitions for route and shared-element changes, with Motion fallback.
6. GSAP is the only optional addition, and only if we need SplitText (masked line/char reveals) or MorphSVG in one lazy chunk. Core 27 kB plus plugin would cost more than hand-splitting `Array.from(text)` into spans, which is trivial for Japanese (one glyph per span, `lang="ja"` retained). Default: do not add.

## 3. Technique recipes

**Brush stroke drawing.** Take the stroke's points from `src/engine/stroke-path.ts`. Run `getStroke(points,{size,thinning:.6,smoothing:.5,streamline:.5,simulatePressure:true,start:{taper:true},end:{taper:true}})` ([docs](https://docsearch.algolia.com/mcp/docs/repo/steveruizok/perfect-freehand)) and convert the outline polygon to an SVG path (filled). A fill cannot use stroke-dashoffset, so reveal it with a mask: put the centreline path in a `<mask>` as a thick white stroke and animate `pathLength` from 0 to 1 with Motion's hybrid `animate` ([animate](https://motion.dev/docs/animate)). This gives variable width plus a drawing reveal.

**Ink diffusion.** Pavel Dobryakov's WebGL-Fluid-Simulation is MIT and works on mobile ([repo](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)); its `script.js` is one file and is built on GPU Gems fluid methods. For a CSP-safe port: run a simplified advection plus dissipation at 128x128 with half-float textures (half-float colour buffers are exposed on iOS, full float is less reliable per [WebKit bug tracker results](https://bugs.webkit.org/show_bug.cgi?id=264404)), seeded by a few "ink drops" at stroke endpoints, 1-2 s then stop. Cheaper fallback: layered radial-gradient blobs on 2D canvas with `globalCompositeOperation:"multiply"` and blur via pre-blurred sprites.

**Washi paper.** Render value-noise fBm plus a fibre-streak term in one fragment shader into a small texture once (for example 512 px), then reuse it as a CSS background or as a three.js texture. Static paper costs nothing per frame. (Inference from standard shader practice; no external source.)

**Particles (petals, gold dust).** One canvas 2D with ≤150 pre-rendered sprites (`drawImage` from an offscreen sprite sheet), integer positions, stop the loop when the system is empty. OffscreenCanvas with WebGL in a worker works from Safari 17 ([WebKit/MDN-derived summary](https://bugs.webkit.org/show_bug.cgi?id=263010)) but 2D particles rarely need it; use only if main-thread contention shows up. Avoid resizing a live WebGL canvas on iOS, which has leaked memory ([bug](https://bugs.webkit.org/show_bug.cgi?id=183720) via search).

**Kinetic typography.** Split to per-glyph spans (`aria-label` on the parent, `aria-hidden` on the spans, as SplitText does ([docs](https://gsap.com/docs/v3/Plugins/SplitText/))). Animate `transform` and `opacity` with Motion `stagger()` ([animate](https://motion.dev/docs/animate)). Mask reveals: wrap each line in `overflow:hidden` and translate the child from 100% to 0.

**View Transitions.** Same-document is supported in Safari 18+, and cross-document with `pageswap`/`pagereveal` in Safari 18.2 per Chrome's guide ([Chrome docs](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document), [2025 update](https://developer.chrome.com/blog/view-transitions-in-2025)). Firefox 144 made same-document Baseline newly available (same update). Use `view-transition-name`, `match-element` (auto naming), and nested groups where available (same update). We are an SPA, so same-document is the one that matters. Always feature-detect `document.startViewTransition`.

**FLIP / shared element.** Motion's `layoutId` handles it in React; Motion disables layout animation under reduced motion ([accessibility](https://motion.dev/docs/react-accessibility)). For a single hero element use a View Transition instead.

## 4. "Make it like video"

- **Scene as data.** Define each scene as an array of Motion sequence segments (`[target, keyframes, {at, duration, ease}]`) so cues live in one file ([animate](https://motion.dev/docs/animate)). Drive canvas and three.js from a Motion value or `animate(0,1,{onUpdate})` so everything shares one clock and `.pause()`, `.time`, `.speed` give scrubbing and tests.
- **2.5D camera.** CSS: a parent with `perspective` and layers at different `translateZ`; animate only the parent's `transform` for parallax. three.js: OrthographicCamera or a shallow-FOV perspective camera, planes at varying z; animate `camera.position` and zoom.
- **Motion blur approximation.** Cheap: on fast moves add a short trail by drawing the last 3-4 positions at falling alpha on canvas, or stretch the element along velocity with `scaleX`. Shader: sample the previous-frame texture and mix at 0.85 (feedback blur). (Inference; no source.)
- **Easing.** Use custom cubic-bezier arrays and springs (Motion supports stiffness, damping, mass in both animate versions ([animate](https://motion.dev/docs/animate))). Project rule: damping 1.0 / `bounce:0` unless after a flick (CLAUDE.md).

## 5. Performance rules (iOS Safari)

1. Animate only `transform` and `opacity`, which are the only properties that skip layout and paint ([web.dev](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)).
2. `will-change: transform` only on elements about to move, and remove it afterwards; each layer costs GPU memory ([web.dev](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)).
3. Prefer WAAPI/CSS animation (mini `animate`, anime.js WAAPI) for simple moves; JS-driven tweens compete with the main thread ([Motion docs](https://motion.dev/docs/react-reduce-bundle-size), [anime summary](https://www.mintlify.com/juliangarnier/anime/installation)).
4. Low Power Mode caps rAF at 30 fps, and iOS also throttles CSS animations then ([Motion article](https://motion.dev/magazine/when-browsers-throttle-requestanimationframe), [WebKit bug 215745](https://bugs.webkit.org/show_bug.cgi?id=215745)). There is no web API to detect it; the Battery Status API is deprecated and unavailable in Safari (same sources). So: write time-based animation (progress from `performance.now()` delta, never per-frame increments), and measure rolling frame delta; if it sits near 33 ms for 1 s, drop particle count and shader resolution by half.
6. Pause offscreen and hidden: `IntersectionObserver` plus `visibilitychange` to stop rAF loops and call `renderer.setAnimationLoop(null)`; use `frameloop="demand"` in r3f for static scenes.
7. Canvas 2D for under ~150 sprites; WebGL when you need per-pixel work (ink, paper). One WebGL context for the app, reused; never resize it live ([bug](https://bugs.webkit.org/show_bug.cgi?id=183720)).
9. Initial JS ≤180 kB gzip: every scene, perfect-freehand, shaders and audio synths go in `import()` chunks fired on idle or on route entry. Motion's `LazyMotion` can load features asynchronously ([bundle](https://motion.dev/docs/react-reduce-bundle-size)).
10. No haptics on iOS Safari (no Vibration API, per CLAUDE.md), so convey feedback with sound and visuals only; pointer events: `preventDefault()` on pointerdown for drawing surfaces (CLAUDE.md WebKit gotcha).

## 6. Reduced-motion strategy

- Single source of truth: `MotionConfig reducedMotion="user"` disables transform and layout animations automatically while opacity and colour persist ([docs](https://motion.dev/docs/react-accessibility), [MotionConfig](https://motion.dev/docs/react-motion-config)). Use `useReducedMotion()` for custom canvas/three scenes.
- Tiers: (a) full scene; (b) reduced: replace movement with cross-fades, show the final frame of brush strokes immediately (static filled path), no particles, no fluid, static paper texture, no camera moves; (c) always keep audio independent from motion, governed by its own mute setting.
- Replace, do not remove, meaning: a stroke-order animation becomes numbered static strokes (Motion docs recommend swapping transforms for opacity ([docs](https://motion.dev/docs/react-accessibility))).
- View Transitions: wrap in a `@media (prefers-reduced-motion: no-preference)` rule or shorten to a plain fade by setting `::view-transition-group(*){animation-duration:0s}`. (Inference.)

## 7. WebAudio synthesis (no audio files)

Hand-written is small and sufficient; ZzFX is a 1.3 kB shortcut ([Bundlephobia](https://bundlephobia.com/package/zzfx@1.4.0), [npm](https://npmjs.com/package/zzfx)); Tone.js is ~75 kB gzip ([depscope](https://depscope.dev/pkg/npm/tone)). Recipes (inference, standard synthesis practice):

- **Taiko hit:** sine oscillator, frequency ramp 140 Hz down to 50 Hz over 0.25 s (`exponentialRampToValueAtTime`), gain envelope 1 to 0.001 over 0.5 s, plus 30 ms low-passed noise burst for the attack.
- **Wind chime:** 3-5 sine partials at inharmonic ratios (1, 2.76, 5.4), each with 2 s exponential decay, random 40 ms offsets.
- **Brush swish:** white noise through a bandpass filter (Q about 1) sweeping 800 to 3000 Hz, gain bell of 0.3 s.
- **iOS specifics:** create one `AudioContext` on first user gesture and `resume()` there; handle the `interrupted` state on return from background; the hardware silent switch mutes plain WebAudio, and a looped silent media element upgrades the audio session ([unmute](https://github.com/swevans/unmute), [guide](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)). Decide product-wise whether to honour the silent switch (courteous default: yes, do not work around it).

## Gaps

npmjs.com pages were not fetchable, so versions are from the registry API. Theatre.js and Tone.js sizes come from third-party indexes. I did not measure CSP behaviour or iPhone frame rates; both need a device test.
