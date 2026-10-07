# Japanese motion references for Kintsugi

Method: 24 web searches plus 14 page fetches (Oct 2026). Sources rarely give frame-level timing. Where this report gives numbers, they are **our proposals (marked "proposal")**, not measurements of the cited work. Where a source did not say something, it is not claimed.

## 1. Key references

| Name | Maker | Year | URL | What to borrow |
|---|---|---|---|---|
| Neon Genesis Evangelion title cards | Hideaki Anno / Gainax; typeface Matisse EB (Fontworks) | 1995 | https://fontsinuse.com/uses/28760/neon-genesis-evangelion | Black-and-white cards of one heavy mincho face, "mechanically compressed to fit into interlocking compositions"; compression reads as haste. Anno chose a serif against the sans-serif sci-fi norm. Borrow: kanji as a hard graphic block, not a caption. See also https://arthistory.hku.hk/index.php/typography-and-cultural-intersections-a-case-study-on-neon-genesis-evangelion-part-one/ |
| Evangelion font adoption | Fontworks interview | 2015 | https://route2015.otakumode.com/interview/01/2/ | Anno picked Matisse EB himself from a catalogue, set via desktop publishing. Typeface choice alone can carry a brand. |
| Monogatari series intertitles | Shaft, dir. Akiyuki Shinbo | 2009- | https://kosatenmag.com/home/deconstruction-monogatari-part-three-language | Title cards "flash onscreen, sometimes too quickly to read"; black scenes read as blinks, red scenes as intense emotion; katakana-to-hiragana shift marks character growth. Borrow: colour-coded flash cards and script choice as meaning. |
| Persona 5 UI | Atlus, Masayoshi Suto | 2016 | https://www.dtnext.in/amp/story/edit/exuberant-video-game-menus-designed-with-da-vinci-in-mind-807823 | UI as "graphical entertainment"; ransom-note and sports-graphics type. A selected item grows and takes one accent colour against a red/black/white base: https://mechanicsofmagic.com/2022/04/23/visual-design-of-games-persona-5/ |
| Persona 5 menu cost | Atlus (via press) | 2024 | https://www.actugaming.net/les-menus-stylises-de-persona-et-metaphor-refantazio-sont-tres-beaux-mais-aussi-tres-penibles-a-concevoir-selon-atlus-678450/ | Expressive menus are expensive to build. Keep our set small and reusable. |
| Chainsaw Man OP "Kick Back" | MAPPA; OP dir. Shingo Yamashita; music Kenshi Yonezu | 2022 | https://animecorner.me/chainsaw-man-anime-releases-opening-video/ | Cast-by-cast montage pacing. No typography analysis was found in sources, so borrow only the "one beat per image" rhythm. |
| Telop (TV overlay text) | Japanese variety and news TV | 1960s- | https://en.fontworks.co.jp/column/14586/ and https://doras.dcu.ie/26624/1/Sasamoto_Ohagan%202020_pre%20print.pdf | Telop clarifies structure and "hooks" viewers; variety style is ultra-thick gothic with white outline, red text, yellow shadow. Borrow sparingly for the *correct* burst, never for ambient UI. |
| Hicozoh Akamatsu title design | Hicozoh Akamatsu; exhibition National Film Center | 1983 (Tokyo Trial) | https://metropolisjapan.com/hicozoh-akamatsu | A stark title resembling a rubber-stamped "guilty": the stamp as title. Direct precedent for hanko-style stamps. |
| Studio Ghibli title cards | Studio Ghibli | 1980s- | https://desirabilitylab.com/backfill/backfill-2025-361-studio-ghibli-title-cards | Hand-painted lettering matched to each film's world (brush for Spirited Away, rounded for Totoro). Borrow: let the kanji's stroke order draw itself in a brush voice. |
| Yugo Nakamura / tha ltd. | Yugo Nakamura (yugop) | 1998-; tha 2004 | https://en.wikipedia.org/wiki/Yugo_Nakamura | Behaviour "modeled on the natural world"; ecotonoha (2004) won Cannes Cyber Lion Grand Prix. Borrow: physics-like, never-linear responses. Also https://tokyotypedirectorsclub.org/en/award/2009_grandprix/ |
| Semitransparent Design / Semitra | Semitransparent Design (Ryoji Tanaka et al.) | 2003- | https://www.ycam.jp/en/archive/works/movable-type/ | Type and web linked to real space; tFont experiments (https://www.ycam.jp/asset/pdf/press-release/2009/tfont-ftime_en.pdf). Borrow: letterforms as live material. |
| Garden Eight | Hiroki Noma, Tokyo | 2011- | https://www.awwwards.com/GardenEight/ | 15 Site of the Day wins incl. FIL - SUMI LIMITED (2020), aircord (2020, 2024), Shapefarm (2021), The Shift (Site of the Month, 2021), 601 Inc. (2022), ANAI (2024). Described as "calm, thoughtful interactions and a distinctive sense of flow" (https://jp.linkedin.com/in/hirokinoma). Study FIL - SUMI first. I could not extract transition timings from these pages. |
| Awwwards page-transition gallery | Awwwards | ongoing | https://www.awwwards.com/inspiration/page-transitions-torii-studio | Torii Studio shows hover, typing and scroll transitions; descriptions are generic. Use as a browsing list, not as evidence of timing. |
| Moving ukiyo-e | Atsuki Segawa | 2015- | https://www.openculture.com/?p=1059133 | Flat woodblock layers animated with parallax and rolling motion (Great Wave). Borrow: layered flat colour, no 3D shading. |
| Kintsugi (craft reference) | Traditional; urushi lacquer with gold powder | 15th c. onward | https://nohoartsdistrict.com/kintsugi-the-art-of-repairing-with-gold-technique-and-meaning/ | Gold goes on wet lacquer along the break; repair is shown, not hidden. Maki-e uses the same sprinkled powder. |

Not found with citable detail: NHK idents, Sakamoto Days OP, Takram, Nendo, Dentsu Lab, Bascule, Locomotive, homunculus (search returned a film), Kurosawa titles. I leave them out rather than invent.

## 2. Motion vocabulary

- **Ma (negative space, pause).** "Space between", "mindful pause", "active silence" (https://abeckoningworld.substack.com/p/the-mysterious-power-of-ma-in-storytelling). Use: a held beat of 300-500 ms of stillness before a reveal (proposal).
- **Jo-ha-kyū (slow, accelerate, fast).** "Introduction/slow, development/acceleration, conclusion/fast"; Noh walking starts slow and accelerates (https://noh.stanford.edu/movement/forward). Use as the easing shape for entrances and for a whole session: slow open, quickening middle, sudden close. Note it is a macro structure; per-element springs can stay critically damped as CLAUDE.md requires.
- **Brush pressure.** Calligraphy has uneven stroke width, so a plain path draw looks wrong; the standard fix is a mask path over the glyph with stroke-dashoffset animated to 0 (https://css-tricks.com/?p=271643, https://frontendmasters.com/courses/svg-essentials-animation/drawsvg). Use: reveal each kanji stroke in stroke order with a speed ramp (fast middle, slow at the lift). Our engine already has stroke points in `src/engine/stroke-path.ts`.
- **Stamp (hanko) as punctuation.** A single hard impact with no easing in, as in Akamatsu's stamped title (https://metropolisjapan.com/hicozoh-akamatsu). Proposal: 80-120 ms scale from 1.15 to 1.0, damping 1.0.
- **Flash card as rhythm.** Monogatari cuts to full-screen text mid-scene (https://kosatenmag.com/home/deconstruction-monogatari-part-three-language). Use only for rare moments (level up), and keep a still frame so it stays readable and reduced-motion safe.
- **Selected-item emphasis.** Grow plus one accent colour on a restrained base (https://mechanicsofmagic.com/2022/04/23/visual-design-of-games-persona-5/). Our accent is gold on lacquer.
- **Craft over template.** Ghibli's consistency "comes from craft rather than a style guide" (https://desirabilitylab.com/backfill/backfill-2025-361-studio-ghibli-title-cards). One texture and one brush voice everywhere.
- **Natural-world behaviour.** Nakamura's work models behaviour on nature (https://en.wikipedia.org/wiki/Yugo_Nakamura): drift and settle, never loop mechanically.
- **Wabi-sabi / repair as visible history.** Breakage is part of the object's history, not disguised (https://nohoartsdistrict.com/kintsugi-the-art-of-repairing-with-gold-technique-and-meaning/). This is the app's core metaphor for mistakes.

## 3. Motifs worth using and how to avoid cliché

Meanings, so use is deliberate: sakura signals transience; seigaiha signals calm strength and good fortune (https://musubikiln.com/blogs/journal/8-traditional-japanese-patterns-and-their-origins). Seigaiha is already "a global graphic-design staple" and a motif reads differently by era and context (same source family: https://yunomi.life/blogs/discover/the-world-of-japanese-patterns). The cliché risk is real, so the rules below are our judgement.

| Motif | Use | Avoid |
|---|---|---|
| Gold seam (kintsugi) | Core: a line that grows along a crack to mark a lapse mended. Gold dust on lacquer as in maki-e (https://nohoartsdistrict.com/kintsugi-the-art-of-repairing-with-gold-technique-and-meaning/). | Glitter, lens flares, or any "shiny luxury" look (stock kintsugi loops lean this way: https://stock.adobe.com/search/video?k=kintsugi). Keep the gold matte and thin. |
| Sumi ink / brush | Strokes revealed in order; ink as a wipe for transitions. | Full-screen ink splashes on every tap. |
| Hanko stamp | Confirm/complete marks, one red square. | Fake kanji for decoration; every glyph must come from packs. |
| Seigaiha / waves | A quiet background texture that is revealed only as progress fills. | Wallpapering the UI; Great Wave pastiche. If used, flat layered colour with slow parallax (Segawa approach, https://www.openculture.com/?p=1059133). |
| Sakura / momiji | Once per season or milestone, a handful of petals, not a storm. | Constant falling petals; pink gradients. |
| Shoji / noren | Panels sliding as route transitions, with a held beat. | Skeuomorphic wood grain. |
| Mon crest | A small mark for streaks or levels. | Real family crests; keep it abstract. |
| Torii, lanterns, fireflies, snow | Occasional ambient moments, tied to a real event. | Default hero imagery. |

General rule: a motif earns its place only if it carries a function (progress, repair, confirmation). The telop, Persona and Evangelion examples all work because type does a job, not because of decoration.

## 4. Ten animation ideas for the app

Durations are proposals and need tuning on device.

1. **Opening: the bowl.** Dark lacquer screen, 400 ms of stillness (ma), then a hairline gold crack grows across it in jo-ha-kyū pacing (about 1.4 s, slow start, fast end) and resolves into the app mark. Skip on repeat visits. Inspired by gold-on-wet-lacquer (https://nohoartsdistrict.com/kintsugi-the-art-of-repairing-with-gold-technique-and-meaning/).
2. **Route transition: shoji slide.** Two flat panels meet or part at the centre (about 350 ms, critically damped), new route fades beneath; a 100 ms hold in the middle. Reduced motion: cross-fade.
3. **Route transition alternative: ink wipe.** A brush-edged mask (SVG mask, https://css-tricks.com/?p=271643) reveals the next screen along a horizontal stroke. Use only for Library to Study.
4. **Between cards: noren push.** The finished card lifts and drifts up a few pixels while fading; the next card settles in with damping 1.0. Use a 120 ms ma gap so cards do not feel machine-fed.
5. **Kanji introduction: stroke-order brush.** Draw strokes in order from pack data, speed ramp per stroke (fast mid, slow at the lift). Same data feeds tracing.
6. **Correct: one-stroke gold underline plus soft stamp.** A gold line sweeps under the answer and a small red hanko dot lands (80-120 ms). No confetti.
7. **Incorrect: the crack, then the seam.** A fine crack appears in the card edge (no shake, no red flash). When the item is answered correctly later, gold fills the crack. This makes the theme the learning loop: a mistake becomes visible repair, not a penalty.
8. **Selected answer emphasis.** Selected option grows slightly and takes the gold accent against lacquer (Persona 5 pattern: https://mechanicsofmagic.com/2022/04/23/visual-design-of-games-persona-5/).
9. **Session complete: bowl assembly.** The session's cards appear as shards on a plate; correct ones glide into place, mended ones carry visible gold seams, ending with a still held frame (ma) and a seigaiha texture rising behind as progress. Pace the whole session recap in jo-ha-kyū.
10. **Level up: single flash card.** A full-screen Monogatari-style card (https://kosatenmag.com/home/deconstruction-monogatari-part-three-language): the new level's kanji in a heavy mincho (Evangelion-style compression for emphasis, https://fontsinuse.com/uses/28760/neon-genesis-evangelion) stamped on lacquer, held 1 s, then settled into the profile. Optionally a handful of petals or a lantern glow on a milestone only.

Implementation notes: all reveals use `src/engine/stroke-path.ts` points; every animated component honours `prefers-reduced-motion` (swap to opacity changes and keep the gold seam as a static line); every Japanese string stays inside `lang="ja"`.
