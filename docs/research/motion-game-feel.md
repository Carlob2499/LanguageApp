# Motion, game feel and feedback for Kintsugi

Scope: what games and learning apps do to make practice absorbing, and how we apply it to kanji and vocabulary review. "Source" means a cited page. Anything marked **(our proposal)** is design judgement, not a sourced claim. Numbers from sources are starting points for tuning, not laws.

## 1. Techniques table

Intensity scale: 1 = barely noticed, 3 = clearly felt, 5 = full celebration. Default to the low end. Every motion needs a `prefers-reduced-motion` fallback (opacity or colour only, no movement, no shake).

| Technique | Source | How to apply in Kintsugi | Intensity |
|---|---|---|---|
| Squash/stretch and tween everything | [Jonasson and Purho](https://www.gamedeveloper.com/design/video-is-your-game-juicy-enough-) | Card answer buttons press down 2-3%, the revealed card settles with a critically damped spring (CLAUDE.md default), correct tile pops to about 1.04 then rests. | 1-2 |
| Hit stop (freeze a few frames) | Nuclear Throne freezes about 10-20 ms on hit ([Infovore write-up of "Art of Screenshake"](https://infovore.org/?p=5275)); weak 0-0.03 s, strong 0.05-0.08 s, critical 0.1-0.15 s ([Unity game feel primer](https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/)) | Never freeze input. Instead hold the correct-answer flash for about 60 ms before the next card slides in. Reserve 100 ms holds for combo 10 and level up. | 1-3 |
| Screenshake with decay | Vlambeer: kick camera 6 px, add 4 to shake, which "degenerates quickly" ([Infovore](https://infovore.org/?p=5275)); trauma-based shake from Eiserloh's GDC 2016 talk ([Game Developer](https://gamedeveloper.com/programming/video-sprucing-up-cameras-with-math)) | Do NOT shake on wrong answers (punitive). Allow a 2 px, 120 ms nudge on the card only at combo 10 and level up, off in reduced motion. | 0-2 |
| White flash frame on impact | One white frame then two "hit" frames; flash about 80 ms ([Infovore](https://infovore.org/?p=5275); [Unity primer](https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/)) | Brief gold (kintsugi) wash across the card edge, 80 ms, never full-screen white (see section 5). | 2 |
| Combo milestone, not every hit | osu!taiko celebrates every 50 hits and resets on break ([osu! wiki, mintlify mirror](https://mintlify.com/ppy/osu/game-modes/taiko)) | Celebrate at 3, 5, 10 and then every 10, scaled down for small decks. A break resets quietly. | 1-4 |
| Music-synced feedback (synesthesia) | In Tetris Effect, movements and clears add to the soundtrack and drive visuals ([Engadget](https://www.engadget.com/2018-11-21-tetris-effect-ps4-synesthesia-psvr.html); [GamesBeat interview](https://gamesbeat.com/tetsuya-mizuguchi-interview-taking-tetris-on-a-ps-vr-acid-trip/)) | Correct answers play a pentatonic note quantised to a soft 90 BPM pulse, so a streak becomes a phrase. Visual ripple uses the same colour as the note. | 2-3 |
| Hover/selection as expressive motion | Persona 5 enlarges and colours the selected item and swaps the protagonist's pose per menu ([Mechanics of Magic](https://mechanicsofmagic.com/2022/04/23/visual-design-of-games-persona-5/)) | Library and mode picker: selected item scales to 1.05 with a single accent colour; the background kanji swaps. | 2 |
| Full-screen splash for a big moment | P5 all-out attack uses a one-frame swap from 3D to hand-drawn art, katakana onomatopoeia and a final bright flash ([Amara transcript of a video essay](https://amara.org/subtitles/wIZbgZ3Jyy5D/en/1/download/The%20Overwhelming%20Style%20of%20Persona%205s%20All-Out%20Attacks.en.txt)) | One result splash per session, not per card (section 3). Use the kanji of the session as the splash. | 4-5 |
| Level-up needs fanfare | WaniKani users built a script because levelling had little celebration and the bar simply resets ([WaniKani forum](https://community.wanikani.com/t/leveling-up-how-bout-a-round-of-applause/16389)) | Show a real level moment (section 2). | 4 |
| Milestone streak animation | Duolingo's new streak-extension animations on milestone days raised 7-day retention for new learners by 1.7% ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)) | Animate only on milestone days (3, 7, 30...), plain tick otherwise. | 2-4 |

## 2. Feedback spec

All durations are starting values. Sound is WebAudio only (section 4). Reduced motion: replace movement with a 150 ms colour or opacity change; sound stays unless muted.

| Event | Visual | Sound | Haptic (where supported) |
|---|---|---|---|
| Correct | Card edge gold wash 80 ms, spring settle, next card in after 60 ms hold. | Soft koto pluck, scale degree 1. | 8 ms tick |
| Wrong | Card dips 2 px and tints a warm muted rose, never red; the right answer fades in beside it, and the card returns to the queue. No shake, no buzzer. | Low, short wood-block "tok", no falling pitch. | none |
| Combo 3 | Small ring ripple from the card; counter fades in ("3 in a row"). | Koto phrase rises to degree 3. | tick |
| Combo 5 | Ripple plus ink-drop trail along the progress bar; counter scales to 1.1. | Add a quiet fūrin chime on top. | double tick |
| Combo 10 | Gold seam sweeps the whole card edge, 100 ms hold, 2 px nudge. | Taiko "don" under the koto, then a shakuhachi-ish breath swell. | 20 ms pulse |
| Perfect session (no misses) | Results splash: session kanji drawn in ink then gold seam fills; accuracy shown plainly. | Phrase resolves to the tonic with taiko roll and chime cascade. | short pattern |
| Level up | Slow ink wipe, level kanji, list of newly unlocked items, one "continue" button, skippable. Under 3 s before it can be dismissed. | Fuller version of the perfect phrase plus a single low taiko hit. | 30 ms pulse |
| Combo break | Counter dissolves quietly, no negative cue. | none | none |


## 3. Session as a run

Pacing logic: rhythm and arcade games ramp challenge in step with skill to hold players in flow ([Game Developer](https://www.gamedeveloper.com/design/the-flow-applied-to-game-design)). Microflow works in 3-15 minute sessions through rhythmic input and positive reinforcement (same source). A run of about 5-10 minutes fits that window. Phase timings below are **(our proposal)**.

| Phase | Time (10-minute run) | What happens |
|---|---|---|
| Opening ritual | 0:00-0:15 | Ink-stone motif; one breath-length animation; today's goal in one plain line ("12 kanji, about 5 minutes"). Tap to begin, skippable after the first week. |
| Warm-up | 0:15-2:00 | Easiest due cards first (high stability), no combo counter shown, quiet sound. Builds early wins. |
| Rising tempo | 2:00-6:00 | Mix in harder and new items. Ambient pulse becomes audible at 90 BPM; combo counter appears from 3. Transitions shorten from 300 ms to 220 ms. |
| Climax | 6:00-8:30 | Hardest cards (lapses, leeches) scheduled together; this is where combo 10 can land. Keep it optional: "Finish early" is always visible. |
| Cool-down | 8:30-9:15 | Two or three easy review cards so the run ends on success rather than a failure. |
| Results | 9:15-10:00 | One screen: accuracy, items learned, strongest kanji (ink drawn), what is due tomorrow, streak tick. One "Done" button. Perfect-session and level-up moments play here, not mid-run. |


## 4. Sound cues synthesisable with WebAudio

All recipes are **(our proposal)** built from standard primitives: oscillators, gain-node envelopes, buffer noise ([Web Audio guide summary](https://dev.to/iamschulz/building-a-synthesizer-in-javascript-l3l); [WebX0X drum synth](https://repository.gatech.edu/entities/publication/20ad2908-b0f0-46cb-8354-2bc7261e7995)). No audio files are needed, which respects the licence rule in CLAUDE.md. Use a Japanese pentatonic (for example D, E, G, A, B, the "yo" shape, or hirajoshi) so any sequence of correct answers sounds consonant; confirm the scale choice by ear, since I found no source specific to koto scales.

| Sound | Recipe |
|---|---|
| Koto pluck | Karplus-Strong: fill a delay line with noise, low-pass feedback average ([Wikipedia: Karplus-Strong](https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis)). In WebAudio use an AudioWorklet, or approximate with a triangle oscillator, fast 3 ms attack, 600 ms exponential decay, low-pass 2.5 kHz closing to 800 Hz. Pitch bend up a few cents at onset. |
| Taiko don | Sine at 110 Hz dropping to 55 Hz in 120 ms, plus 40 ms low-passed noise burst; gain decay 300 ms. Layer a lower copy for big hits ("katsu" is a higher, drier hit: 220 Hz sine, 60 ms). osu!taiko separates a deep centre "don" from a sharp rim "kat" ([osu! wiki mirror](https://mintlify.com/ppy/osu/game-modes/taiko)). |
| Shakuhachi-like breath | Band-pass filtered noise (centre at pitch, Q about 20) mixed with a sine at the same pitch; slow 250 ms attack, 600 ms release, 5 Hz vibrato of +-8 cents. Use only for combo 10, perfect session and level up. |
| Fūrin (wind chime) | Two or three sine partials at inharmonic ratios (1, 2.76, 5.4), 5 ms attack, 1.5 s decay, random pitch from the scale, high-passed at 800 Hz. Very quiet (about -24 dB). |
| Wood-block "tok" (wrong) | Triangle at 330 Hz, 30 ms decay, band-pass 1.2 kHz. No downward glide. |
| UI tick | 2 ms click through a 4 kHz band-pass, -30 dB. |

Engineering notes: unlock AudioContext on first tap (iOS); schedule on `currentTime`; global mute; cap 4 voices.

## 5. Accessibility guardrails

- No content flashing more than three times in any one second unless below the luminance and size thresholds ([WCAG 2.1 SC 2.3.2 (Three Flashes)](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html)).
- Honour `prefers-reduced-motion` everywhere (already a project rule). Provide a Settings switch "Gentle mode" that disables shake, holds and splash.

## 6. Ethics note

What drives retention elsewhere, and where the line is:

- Streaks: learners with a 7-day streak are 3.6 times more likely to complete a course; as streaks lengthen, loss aversion rather than accomplishment keeps people going on unmotivated days ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)). Duolingo also reports that two equippable freezes raised daily active learners by 0.38%, citing research that "slack" aids persistence (same source).
- Criticism: studies of Duolingo describe urgency, emotionally charged notifications and leagues that cause stress and "gamification misuse" where users chase points instead of learning ([arXiv 2203.16175](https://arxiv.org/abs/2203.16175); [Deceptive Patterns](https://deceptive.design/articles/teaching-or-manipulating-on-the-adoption-of-bright-and-deceptive-patterns-by-duolingo)). WaniKani's community also reports some people racing for levels and burning out ([WaniKani forum](https://community.wanikani.com/t/i-am-the-kanji-master%E2%84%A2-lv-60-self-indulgement-post/38683)).
- Self-determination theory: rewards help only when they support competence, autonomy and relatedness; controlling rewards or points for irrelevant activity can backfire ([Utrecht CHI 2022 workshop paper](https://webspace.science.uu.nl/~veltk101/publications/art/chi2022-sdtws.pdf); [UXCEL summary](https://uxcel.com/lessons/the-nature-of-motivation-in-gamification-352)).

Rules for Kintsugi **(our proposal, derived from the above)**:

1. Reward correctness and effort, never raw volume or speed. No XP for tapping through.
2. No variable-ratio or random loot boxes. Predictable celebrations at known milestones only.
3. Streaks are forgiving by default: a rest day, or an automatic freeze, never wipes progress. A broken streak says "welcome back", with no guilt copy and no mascot sadness.
4. Notifications are opt-in, at most one a day, plain wording, easy to switch off.
5. No leaderboards or leagues by default; competition is against your own graph.
6. Wrong answers are information, not punishment: no shake, buzzer or red.
7. Every effect can be turned off (Gentle mode, mute). Sessions end with a clear stopping point; no "one more" nudges.

## 7. Gaps

No primary sources found for Hades, Persona 3 Reload or Taiko hit feedback; Lingodeer, Busuu and Anki add-ons were not covered. The Juice talk video is behind GDC Vault, so details come from press coverage.
