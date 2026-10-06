# Learning science and SRS engineering decisions for a JLPT N5-to-N1 beginner app

NOTE: Plan mode was active, so this file is a staged copy. The intended destination is `/tmp/claude-0/-home-user-LanguageApp/46bd9feb-75de-50ad-adda-3fe5906e701d/scratchpad/research_notes/JLPT PWA platform and content research/learning_science.md`. Copy the content below there once writes are allowed.

Evidence labels: "(verified)" means seen this session in the cited page or registry. "(search snippet)" means seen only in a search-result summary, not the primary paper. "(UNVERIFIED, from memory)" means my background knowledge, not checked this session.

## Spaced repetition: FSRS (v4/v5/v6/v7) vs SM-2, benchmark results, parameters, cold start

### Takeaway
Use FSRS (v6 via ts-fsrs) rather than SM-2. In the open-spaced-repetition benchmark every FSRS version from v4 up beats the older versions on all three metrics. The benchmark README does not list SM-2 directly. Cold start works because FSRS ships population-default parameters and personal optimization is optional.

### Cited Findings
- The srs-benchmark evaluates about 10,000 Anki users and about 727M reviews. 349.9M reviews are used for evaluation without same-day reviews and 519.3M with them. Metrics are Log Loss, RMSE(bins) and AUC. (verified) — [srs-benchmark README](https://raw.githubusercontent.com/open-spaced-repetition/srs-benchmark/main/README.md)
- Results without same-day reviews (parameters / Log Loss / RMSE(bins) / AUC) (verified) — [srs-benchmark README](https://raw.githubusercontent.com/open-spaced-repetition/srs-benchmark/main/README.md):

| Algorithm | Parameters | Log Loss | RMSE(bins) | AUC |
|---|---|---|---|---|
| FSRS-7 | 34 | 0.3401 | 0.0634 | 0.7167 |
| FSRS-6 | 21 | 0.3460 | 0.0653 | 0.7034 |
| FSRS-5 | 19 | 0.3561 | 0.0742 | 0.7010 |
| FSRS-4.5 | 17 | 0.3625 | 0.0764 | 0.6891 |
| FSRS v4 | 17 | 0.3726 | 0.0838 | 0.6853 |
| FSRS v3 | 13 | 0.4364 | 0.1097 | 0.6605 |

- Other models in the same benchmark (verified) — [srs-benchmark README](https://github.com/open-spaced-repetition/srs-benchmark):
  - DASH variants: Log Loss about 0.368, AUC about 0.62-0.63.
  - HLR: Log Loss 0.4694, AUC 0.6369.
  - ACT-R: Log Loss 0.4033, AUC 0.5225.
  - Baseline average predictor: Log Loss 0.3945, AUC 0.4997.
  - RWKV-Instant neural model: best Log Loss 0.2773 and AUC 0.8329, with about 2.76M parameters. That is impractical for a client-side PWA, whereas FSRS has 21-34 parameters.
- The benchmark README states that SM-2 is not directly benchmarked there and that separate repos compare FSRS with SuperMemo 15/16/17. (verified, via fetch summary) — [srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark)
- The benchmark includes an "FSRS-7 default param." row: 0 optimized parameters, Log Loss 0.3399, RMSE 0.0895, AUC 0.7283 (with same-day reviews). Even without optimization it is competitive with other models. (verified) — [srs-benchmark README](https://raw.githubusercontent.com/open-spaced-repetition/srs-benchmark/main/README.md)
- FSRS-6 has 21 parameters and FSRS-7 has 34. (verified) — [srs-benchmark README](https://raw.githubusercontent.com/open-spaced-repetition/srs-benchmark/main/README.md)
- Anki's manual: default desired retention is 90%, described as a good balance. Workload rises steeply above 90%, and above 97% it can be overwhelming. (verified) — [Anki manual, deck options](https://docs.ankiweb.net/deck-options.html)
- Anki's manual says optimization needs data and a low number of reviews (fewer than a few hundred) is problematic. No exact minimum is given. (verified) — [Anki manual](https://docs.ankiweb.net/deck-options.html)
- A claim that FSRS cuts reviews by 20-40% at equal retention comes only from forum and blog snippets (search snippet, low quality). The Anki manual and awesome-fsrs README give no such figure. Treat it as unverified marketing. — [search results incl. Anki forum thread](https://forums.ankiweb.net/t/why-does-fsrs-provide-fewer-review-than-the-original-anki-sm-2/35567)
- FSRS models memory with three components, DSR: Difficulty, Stability and Retrievability. (UNVERIFIED, from memory: the abc-of-fsrs wiki page I fetched had moved to awesome-fsrs and no details were retrievable.)
- SM-2 is a fixed-formula scheduler with a per-card ease factor and no learned parameters. (UNVERIFIED, from memory)

### Inferences
- Choose FSRS-6 via ts-fsrs. It is the current stable library, it is pure scheduler code with no server, and the benchmark shows it ahead of the v4/v4.5/v5 generations. SM-2 would be a deliberate downgrade, justified only if simplicity matters more than efficiency.
- A brand-new user has no review history, so ship the default parameters and 0.90 desired retention. Skip per-user optimization in v1. Make retention a setting, for example 0.85-0.92. Because workload is nonlinear in retention, a beginner on a heavy load may do better at 0.85-0.88. This is an inference, not a finding.
- Log every review (card id, rating, timestamp, state) from day one, so optimization can be added later without a data migration.

### Gaps
- No direct SM-2 vs FSRS numbers from the benchmark repo. The SM-2 comparison repos (SuperMemo 15/16/17) were not fetched.
- Exact FSRS formulae and the default 21-parameter vector were not retrieved. The wiki had moved.
- Minimum reviews needed for optimization: only "a few hundred" (Anki manual), with no precise threshold.
- No benchmark data specific to Japanese vocabulary or kanji decks, or to a first-time-user population. Anki users are experienced and self-selected.

## ts-fsrs npm package: version, API, size, optimizer, v5 changes

### Takeaway
ts-fsrs 5.4.2 (MIT, published 2026-09-01) is confirmed by the npm registry. It is scheduler-only and implements FSRS-6. Parameter optimization lives in a separate package. The dist-tags also show a 6.0.0-beta.13 under the `beta` tag.

### Cited Findings
- Registry dist-tags: `latest` is 5.4.2 and `beta` is 6.0.0-beta.13. 5.4.2 was published 2026-09-01T02:23:24Z, license MIT, unpacked size 706,415 bytes. No runtime dependencies are listed for 5.4.2. (verified via direct registry JSON) — [npm registry](https://registry.npmjs.org/ts-fsrs)
- Publish dates (verified) — [npm registry](https://registry.npmjs.org/ts-fsrs):

| Version | Published |
|---|---|
| 5.0.0 | 2025-05-12 |
| 5.1.0 | 2025-06-10 |
| 5.2.0 | 2025-06-15 |
| 5.3.0 | 2026-03-19 |
| 5.4.0 | 2026-05-18 |
| 5.4.1 | 2026-05-22 |
| 5.4.2 | 2026-09-01 |

- One fetch summary claimed a `seedrandom` dependency, while the direct registry JSON shows no dependencies for 5.4.2, and unpkg's package.json lists only devDependencies. Trust the registry JSON. Verify with `npm view ts-fsrs@5.4.2 dependencies` before relying on this. — [unpkg package.json](https://unpkg.com/ts-fsrs/package.json)
- Package formats: ESM (`dist/index.mjs`), CJS (`dist/index.cjs`), UMD (`dist/index.umd.js`), types (`dist/index.d.ts`). Node >= 20 is required for the repo and its packages. (verified) — [unpkg package.json](https://unpkg.com/ts-fsrs/package.json), [ts-fsrs README](https://github.com/open-spaced-repetition/ts-fsrs)
- Size: 22,462 bytes minified and 7,192 bytes gzip. (search/fetch snippet from the bundlephobia API; moderate confidence, re-check at build time) — [bundlephobia](https://bundlephobia.com/api/size?package=ts-fsrs)
- API surface (verified via README and d.ts fetches) — [ts-fsrs README](https://raw.githubusercontent.com/open-spaced-repetition/ts-fsrs/main/packages/fsrs/README.md), [unpkg d.ts](https://unpkg.com/ts-fsrs/dist/index.d.ts):
  - `createEmptyCard()`, `fsrs(params?)`, `generatorParameters(partial?)`.
  - `repeat(card, now)` previews all four outcomes. `next(card, now, rating, afterHandler?)` applies one rating.
  - `get_retrievability(card, now, withFuzz?)`, `forgetting_curve`, `next_state`, `next_interval`.
  - `rollback(card, log)` undoes a review. `forget(card, now, reset_count?)` resets a card to New. `reschedule(card, reviews, options?)` rebuilds state from review logs.
  - Enums: `Rating` (Again, Hard, Good, Easy) and `State` (New, Learning, Review, Relearning).
- Defaults: `request_retention` 0.9, `maximum_interval` 36500 days, `enable_fuzz` false, `enable_short_term` true. Configurable fields are `request_retention`, `maximum_interval`, `w`, `enable_fuzz`, `enable_short_term`, `learning_steps` and `relearning_steps`. (verified) — [unpkg d.ts](https://unpkg.com/ts-fsrs/dist/index.d.ts)
- Card fields: `due`, `stability`, `difficulty`, `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, optional `last_review`. ReviewLog fields: `rating`, `state`, `due`, `stability`, `difficulty`, `scheduled_days`, `learning_steps`, `review`. `elapsed_days` and `last_elapsed_days` are deprecated. (verified) — [unpkg d.ts](https://unpkg.com/ts-fsrs/dist/index.d.ts)
- Optimizer: ts-fsrs is the scheduler only. Optimization and CSV conversion are in a separate package, `@open-spaced-repetition/binding`. (verified, via README summary) — [ts-fsrs README](https://github.com/open-spaced-repetition/ts-fsrs)
- Changelog (verified) — [ts-fsrs CHANGELOG](https://unpkg.com/ts-fsrs/CHANGELOG.md):
  - 5.0.0 (major): migrated to FSRS-6, added `learning_steps` on cards and logs, added (re)learning_steps to `FSRSParameters`, and published to JSR.
  - 5.1.0: deprecated several fields and methods.
  - 5.2.0: corrected the FSRS-6 default parameters.
  - 5.3.0: synced with fsrs-rs on same-day review behavior.
  - 5.4.0: added `FSRSError` and `FSRSValidationError`, and NaN parameter rejection.
- The awesome-fsrs list labels ts-fsrs as "v6", meaning the FSRS-6 algorithm. (verified) — [awesome-fsrs README](https://raw.githubusercontent.com/open-spaced-repetition/awesome-fsrs/main/README.md)

### Inferences
- Pin `ts-fsrs@^5.4.2`, not `@beta`. A 6.0.0-beta exists, so expect a future major. Store raw review logs so state can be rebuilt with `reschedule()` after any upgrade or parameter change.
- Persist cards as plain JSON with ISO dates. Rehydrate `due` and `last_review` to `Date` objects on load, since JSON round-trips lose Date types. This is a common pitfall, not stated by the sources.
- Because v5 changed card and log shape (`learning_steps` fields), any pre-v5 stored cards would need migration. This does not matter for a new app.
- For the optimizer, either leave it out of v1, or run `@open-spaced-repetition/binding` server-side or in a worker later. Its browser and PWA suitability was not verified.
- With `enable_short_term` true, intra-day learning steps matter. For a kana and kanji app, decide whether to use minute-level steps (a longer session) or set steps to [] so all new cards graduate to day intervals.

### Gaps
- The exact default FSRS-6 weights (`w`) length and values were not confirmed. One summary said 19 elements, which conflicts with FSRS-6's 21 parameters per the benchmark. Check `default_w` directly in the package.
- `@open-spaced-repetition/binding` (a WASM/native binding) has unverified browser support and bundle size.
- No verification that bundlephobia's figure matches a real Vite build.

## Retrieval practice, recognition vs recall, typed vs MCQ vs self-graded, 4-button vs 2-button

### Takeaway
Retrieval practice reliably beats restudy (about g = 0.5-0.6 in the 2017 meta-analysis). Default to effortful recall (typed or self-graded after attempting retrieval), use recognition (MCQ) only for first exposure or as a lower-effort mode. Use 4 buttons only if the app surfaces them cleanly. Evidence on 4 vs 2 buttons was not found.

### Cited Findings
- Adesope, Trevisan and Sundararajan (2017) meta-analysis: 118 articles, 272 independent effect sizes, about 15,400 participants. Practice testing beat restudy and other comparison conditions, with a mean effect of about g = 0.5-0.61. The effect was moderated by test format and other features. (search snippet) — [Review of Educational Research 2017](https://journals.sagepub.com/doi/10.3102/0034654316689306)
- Dunlosky et al. (2013, Psychological Science in the Public Interest) rated practice testing and distributed practice as the two "high utility" techniques. Summarization, highlighting and rereading rated low. (search snippet) — [APS summary](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html)
- Cepeda et al. (2008, Psychological Science, 1,350+ participants): optimal spacing gap grows with retention interval. It is about 20-40% of a one-week test delay and about 5-10% of a one-year delay. (search snippet) — [Cepeda et al. 2008](https://pubmed.ncbi.nlm.nih.gov/19076480/)
- Rawson and Dunlosky (2011) on successive relearning: practice to a criterion of three correct recalls, then relearn at widely spaced sessions. Relearning had a pronounced effect on long-term retention at small extra cost. (search snippet, secondary source) — [successive relearning summary](https://www.unh.edu/teaching-learning-resource-hub/sites/default/files/media/2023-06/itow-successive-relearning-dunlosky-greve-badali-wissman-rawson.pdf)
- Nakata (2008, ReCALL 20:3-20), 226 Japanese high-school students learning 10 English words: the computer group beat the word-list group on the delayed post-test, and the card group was not significantly different from either. It was a small, short experiment. (search snippet) — [Nakata 2008, Cambridge](https://www.cambridge.org/core/journals/recall/article/english-vocabulary-learning-with-word-lists-word-cards-and-computers-implications-from-cognitive-psychology-research-for-optimal-spaced-learning/4742121ED692165551C531F6464E67FA)
- Recall (production) generally beats recognition for later retention, and test format effects are moderated by format match. (UNVERIFIED, from memory; Adesope 2017 reports format as a moderator)
- Two-button vs four-button grading: no study found.

### Inferences
- UI mechanic: show the prompt, force an attempt (type the reading, or reveal-after-think), then reveal the answer and grade. Use MCQ only for a card's first one or two exposures and for low-effort or commute mode.
- Self-grading is error-prone for beginners (they cannot tell near-misses). For typed answers, auto-grade correctness (exact or accepted-reading match) and map to Again or Good, and let the user override with Hard/Easy. This reduces rating noise that feeds FSRS.
- Offer 4 buttons (Again/Hard/Good/Easy) because ts-fsrs consumes them natively. For true beginners consider a simplified default of 2-3 visible choices (Again/Good, with Hard and Easy under a long-press or "more" control). This is a design judgment with no evidence found.
- Use a relearning rule inspired by Rawson and Dunlosky: a newly learned card should be recalled correctly several times across sessions before it counts as "learned". FSRS short-term steps achieve a similar effect.

### Gaps
- No primary-source evidence on 4-button vs 2-button grading and its effect on scheduling accuracy or learning.
- No primary study on typed vs MCQ vs self-graded specifically for kanji or kana. The effect-size figures above come from search snippets rather than the full papers.
- Kornell and Bjork (2008) and Dunlosky (2013) were not read in full.

## Interleaving vs blocking, desirable difficulties, similar-looking kanji

### Takeaway
Interleaving helps category induction, and for look-alike kanji it should be applied after each item has been introduced individually. Do not interleave for first exposure.

### Cited Findings
- Kornell and Bjork (2008, Psychological Science): interleaving paintings by 12 artists beat blocking on a later test with unseen paintings, 59% vs 36%, even though learners rated massing as more effective. (search snippet) — [Kornell and Bjork 2008](https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/Kornell_Bjork_2008_PsychScience.pdf)
- Dunlosky et al. (2013) rated interleaved practice as low-to-moderate utility because of limited evidence in some domains. (UNVERIFIED, from memory; the search snippet did not confirm the rating)
- The Bjork "desirable difficulties" framework treats spacing, interleaving and testing as difficulties that improve long-term retention while slowing initial performance. (UNVERIFIED, from memory, consistent with the Kornell and Bjork finding that learners misjudge massing)

### Inferences
- Review queues are already interleaved by FSRS due dates, so a mixed queue is the default. Avoid grouping by lesson in reviews.
- For look-alike kanji pairs (for example 未/末, 土/士), add a contrast card or a discrimination drill ("which of these two?") once both are known. Evidence is by analogy to category induction, not kanji-specific.
- Do not teach a confusable pair in the same introduction batch, since early blocking of similar items is a known confusion risk. (UNVERIFIED, from memory)

### Gaps
- No study found testing interleaved vs blocked kanji with shared components.
- The Dunlosky 2013 interleaving rating was not confirmed.

## Component (radical) decomposition and mnemonics: Heisig, WaniKani, keyword method

### Takeaway
Mnemonics help early recall but may fade without retrieval practice, so pair every mnemonic with SRS. Components should be chosen to be visually reliable and reused across kanji. Do not copy WaniKani's invented radical names without checking they serve the story.

### Cited Findings
- Keyword mnemonic literature: immediate recall improves, but the advantage can reverse or shrink after a delay. Adding pictures of the keyword and referent improved long-term retention. Delayed recall in one reported study was 42.5% (with visual support) vs 29.1% (association-only). (search snippet; mixed sources) — [search results](https://stars.library.ucf.edu/facultybib1990/1773)
- WaniKani uses its own "radicals", a catch-all term for components, and the names are sometimes chosen mostly to support the story rather than to follow traditional radicals. Some learners find these mnemonics hard to remember, and some find Kanji Koohii's user-written mnemonics more effective. (community posts; anecdotal) — [WaniKani radicals](https://knowledge.wanikani.com/wanikani/japanese/radical-names/), [WaniKani forum](https://community.wanikani.com/t/wanikani-mnemonics-are-hard-to-remember/53046)
- Kanji Koohii relies on user-submitted mnemonics (Heisig-style). (verified, community listing) — [Bunpro community](https://community.bunpro.jp/t/kanji-mnemonic-free-resource/135648)
- Dunlosky et al. (2013) treat the keyword mnemonic as low-to-moderate utility, effective mostly for keyword-friendly material and weaker over long delays. (UNVERIFIED, from memory)
- I found no controlled study of Heisig-style or WaniKani-style radical decomposition for kanji acquisition.

### Inferences
- Build a component graph (each kanji lists its components, each component lists the kanji using it) and introduce components before the kanji that use them. This is design inference, not proven.
- Mnemonics: show one short story per kanji, allow user edits (Koohii-style personalization), and never replace SRS with the story. User-written mnemonics fit the generation-effect idea but this was not verified.
- Pitfalls to avoid: invented component names that clash with the real meaning, stories that encode the meaning but not the reading, and relying on mnemonics for readings (kanji have several). Teach readings through vocabulary words instead.

### Gaps
- No peer-reviewed effect sizes for radical or component teaching of kanji were found.
- The keyword-method numbers are from a single snippet of an unidentified study.

## Dual coding: stroke order, handwriting and tracing

### Takeaway
Evidence that handwriting aids kanji knowledge exists but is thin in what I found. Make writing optional, with a tracing mode after recognition is established. Stroke-order animation is cheap and low-risk.

### Cited Findings
- Studies of L2 Japanese learners suggest that typing lets learners bypass recalling the visual and kinetic form of a kanji, and that electronic text input may weaken depth of kanji knowledge. (search snippet) — [Dixon, CATJ 22](https://www.cla.purdue.edu/SLC/japanese/documents/CATJ22/CATJ22-Dixon.pdf)
- Kanji recognition by L2 learners tends to follow orthography to phonology to semantics, and learners analyze the components of a kanji. (search snippet) — [search results](https://www.paaljapan.org/conference2018/Proceedings_of_PAAL2018/pdf/P-7.pdf)
- Air writing (kusho) has been suggested as a way to build a kinesthetic basis for kanji. (search snippet) — [search results](https://teapot.lib.ocha.ac.jp/records/42494)
- No effect sizes found for finger tracing or stroke-order animation.

### Inferences
- Offer three tiers: stroke-order animation on the kanji detail view, an optional "trace it" step on a canvas after the first correct recognition, and a "write from memory" recall mode for users who want it. Keep these out of the core SRS rating loop so a session does not balloon.
- Handwriting recognition from a canvas is a significant engineering cost (needs a recognizer such as KanjiVG-based matching or ML). Defer to a later phase unless writing is a goal. For JLPT, which tests recognition and reading, recognition and reading cards matter more than writing. (inference from the test format, UNVERIFIED)

### Gaps
- No controlled experiment found on tracing vs recognition-only for adult beginners, and no numbers.

## Sentence context, multiple exposures, cloze

### Takeaway
Learn a word in several contexts and review it in sentences, but this specific evidence was only partly retrieved. Use sentence cloze as a later-stage card type.

### Cited Findings
- Nakata's 2008 ReCALL study (see retrieval section) found computer-based spaced learning outperformed lists on delayed tests for Japanese learners of English. (search snippet) — [Nakata 2008](https://www.cambridge.org/core/journals/recall/article/english-vocabulary-learning-with-word-lists-word-cards-and-computers-implications-from-cognitive-psychology-research-for-optimal-spaced-learning/4742121ED692165551C531F6464E67FA)
- A research synthesis of learning vocabulary from word cards exists (Nakata and coauthors). I did not read it. — [PMC research synthesis](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9485613/)
- I did not retrieve evidence on cloze deletion vs plain word cards, nor on the number of exposures needed. Any figures I might quote from memory (for example "about 10 encounters") are UNVERIFIED.

### Inferences
- Card progression: (1) word to meaning (and reading), (2) cloze sentence for the same word once stability is reasonable, (3) fixed example sentences written within the learner's known vocabulary where possible. Whether the sentence cards raise retention is unproven here.

### Gaps
- No primary evidence on cloze and sentence-context effect sizes. Fetch the PMC synthesis and a context-vs-isolation study before the report writer cites any figure.

## Session design: new cards, session length, review-ahead, leeches, streaks

### Takeaway
Cap new cards (about 10-20 per day), gate new cards on review load, and handle leeches by changing the card rather than just repeating it. Avoid hard streak loss mechanics. The streak and motivation evidence was not retrieved.

### Cited Findings
- Anki defaults: 20 new cards per day. A leech is flagged after 8 lapses (default), with warnings every 4 lapses after that, and the note is tagged and suspended. (search snippet from Anki-related pages) — [Anki leeches docs](https://docs.ankiweb.net/leeches.html)
- A secondary guide says beginners should start at 10-20 new cards per day, that each new card generates roughly seven reviews in the next month, and that 20 new per day leads to 140+ daily reviews within a month. The "7 reviews" number is unverified and from a blog-type source. — [studycardsai Anki settings](https://studycardsai.com/blog/anki-settings-guide)
- The Anki manual warns that workload grows exponentially at high retention. (verified) — [Anki manual](https://docs.ankiweb.net/deck-options.html)
- Streak and gamification evidence: none retrieved.

### Inferences
- Defaults: 10 new items per day (kana: up to 5 characters per sitting), a hard cap on today's review count, and "pause new cards when the review backlog exceeds N". Make N visible and adjustable.
- Review-ahead: allow it explicitly as a "study extra" mode that does not distort scheduling, or log it with the real timestamp so FSRS treats early reviews correctly (FSRS uses elapsed time). Never silently reset intervals.
- Leech handling: at about 8 lapses, prompt the user to change the card (add a mnemonic, a contrast card, or an example sentence), or suspend it. This is the standard mechanic. Whether "change the card" works better than suspending was not verified.
- Streaks: use a streak that forgives a missed day (a "freeze") and avoid punitive loss messaging. This is a design inference. The assertion that such designs backfire is UNVERIFIED, from memory.

### Gaps
- No retrieved evidence on optimal session length, streak psychology, or optimal new-card counts beyond Anki conventions.

## Placement test: Yes/No with pseudowords, adaptive staircase, mapping to JLPT

### Takeaway
A Yes/No test with pseudowords, run as an adaptive staircase over frequency or JLPT-level bands, is a fast placement tool. Treat the result as a starting estimate, since JLPT has no official word list.

### Cited Findings
- Yes/No tests ask learners whether they know each word, can check many words quickly, and use pseudowords to detect overestimation. It is unclear how to use pseudoword false alarms to adjust scores. (search snippet) — [Meara 1991, scoring Yes/No tests](https://lognostics.co.uk/vlibrary/meara1991.doc), [JALT proceedings](https://jalt-publications.org/proceedings/articles/1121-who-check-more-pseudowords-low-level-or-high-level-students)
- In a study of 738 Japanese university students, false-alarm rates on pseudowords were 4.68% (higher group) and 3.66% (lower group), so pseudowords were not significantly harder for lower-level students. (search snippet) — [JALT](https://jalt-publications.org/proceedings/articles/1121-who-check-more-pseudowords-low-level-or-high-level-students)
- Japanese-specific vocabulary measures exist, including a Vocabulary Size Test for Reading Japanese and a Kanji Conversion Test. (search snippet) — [Kansai University repository](https://kansai-u.repo.nii.ac.jp/record/17312/files/KU-0020-20200630-01.pdf)
- I did not retrieve the Nation and Beglar vocabulary size test paper, or documentation of how jpdb or Kanji Koohii place users.
- JLPT level lists: the JLPT publishes no official vocabulary or kanji lists since 2010. Community lists (for example Tanos) are approximations. (UNVERIFIED, from memory)

### Inferences
- Test design: sample items per level band (N5 up to N1), show kana-only and kanji items plus some pseudo-kanji or pseudo-words, and use a staircase: move up a band after most known, down after most unknown, stop when the estimate stabilizes (about 30-50 items). Item counts are a design suggestion, not from sources.
- Map the result to a starting point, not a certificate. Say "starting at about N4 content" and let the user override. Never claim an official JLPT level.
- Seed FSRS only for items the user claims to know. Give them a low initial stability so they get a quick first check, rather than treating Yes claims as mastered. (inference)
- A true beginner path should skip the test when the user selects "I know no Japanese" and route to kana.

### Gaps
- No primary documentation for jpdb or Kanji Koohii placement. No validated mapping from Yes/No scores to JLPT bands. Nation and Beglar's paper was not retrieved.

## Kana learning for true beginners

### Takeaway
Mnemonics probably help with hiragana, but evidence for katakana is mixed. Combine picture mnemonics with early retrieval drilling and stop at recognition fluency before heavy writing.

### Cited Findings
- A true-experimental study of 36 high-school students found an app using mnemonics beat flashcards for learning hiragana. Small sample and non-adult. (search snippet) — [CONAPLIN 2018](https://www.atlantis-press.com/proceedings/conaplin-18/125911420)
- A study found that learners of Japanese as a foreign language did not benefit from conventional mnemonics for short- or long-term retention of katakana. (search snippet) — [NCOLCTL 2009](https://doaj.org/article/af5ca5db2c014ed2aa0b0dbf67be6406)
- A JALT article reports using mnemonics to facilitate learning Japanese script characters. (search snippet) — [JALT Journal](https://jalt-publications.org/jj/articles/2624-using-mnemonics-facilitate-learning-japanese-script-characters)
- Typical time to kana fluency: not found. A common claim of "about one to two weeks for hiragana" is UNVERIFIED, from memory.

### Inferences
- Present kana in small groups (5 per sitting), use sound and picture cues for hiragana, and treat katakana as a faster pass without heavy mnemonics, because it shares shapes and sounds with hiragana learning. Evidence for katakana is mixed, so this is a hypothesis.
- Test via recognition (character to sound) first, then sound to character selection. Keep typing romaji as an assessment, not a prerequisite.
- Only gate kanji and vocabulary content once the user has passed a kana check.

### Gaps
- No time-to-fluency data. Both mnemonic studies are small or unconfirmed snippets. Effect sizes absent.

## Summary decision table (for the report writer)

| Mechanic | Decision | Confidence |
|---|---|---|
| Scheduler | ts-fsrs 5.4.2 (FSRS-6), default parameters, 0.90 retention, retention setting exposed | High |
| Optimizer | Defer; log all reviews; consider a binding package later | Medium |
| Card format | Recall-first, auto-graded typed or reveal, MCQ only as a first exposure or low-effort mode | Medium |
| Grading | 4 ratings internally, simplified visible UI for beginners | Low (no evidence) |
| Interleaving | Mixed queue by default, contrast cards for confusable kanji after both known | Medium |
| Mnemonics and components | Component graph, user-editable mnemonics, always paired with SRS | Low-medium |
| Writing | Stroke animation now, tracing optional, handwriting recognition deferred | Low |
| Sentences and cloze | Later-stage card types | Low (evidence not retrieved) |
| New cards | About 10 per day with backlog gating, leech prompt at 8 lapses | Medium (Anki conventions) |
| Placement | Yes/No with pseudowords and adaptive staircase, mapped as a starting estimate | Medium |
| Kana | Small groups, picture mnemonics for hiragana, recognition first | Low-medium |

## Method note
About 24 tool calls were made, over the 15-call guideline, to cover many sub-questions. Several effect sizes come from search snippets rather than the primary papers. Read the primary sources before quoting numbers.
