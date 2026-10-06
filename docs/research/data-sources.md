# Licensed data sources and licences for a Japanese kanji/vocabulary learning PWA (build-time pipeline)

Checked: 2026-10-06 (live fetches via WebFetch/WebSearch; most WebFetch results are small-model summaries of the page, so quotes marked "verbatim" are as returned by the fetch tool and should be re-confirmed against the page before legal sign-off). NOTE: written to the plan-mode plan file because plan mode forbade writing to the requested path (/tmp/claude-0/-home-user-LanguageApp/46bd9feb-75de-50ad-adda-3fe5906e701d/scratchpad/research_notes/JLPT PWA platform and content research/data_sources.md); copy it there.

## 1. EDRDG: JMdict, KANJIDIC2, RADKFILE/KRADFILE (licence, hosting, structure, priority markers)

### Takeaway
All EDRDG files are under CC BY-SA 4.0 and the licence imposes (a) acknowledgement on a separate menu-accessible screen for apps and (b) a mandatory procedure for regular updating from the newest versions, with staleness defined as a licence violation. The SKIP codes inside KANJIDIC2 are under a separate CC BY-NC-SA licence, so they should be stripped at build time. Files are regenerated daily.

### Cited Findings
- Licence: "The dictionary files are made available under a Creative Commons Attribution-ShareAlike Licence (V4.0)." — [EDRDG licence](https://www.edrdg.org/edrdg/licence.html)
- Attribution for software: you must "acknowledge the usage and source of the files in the documentation, publicity material, WWW site of the package/server, etc." — [EDRDG licence](https://www.edrdg.org/edrdg/licence.html)
- Dedicated screen wording: "For smartphone and tablet apps, acknowledgement must be made, e.g. on a separate screen accessed from a menu, such as one labelled 'About', 'Sources', etc." — [EDRDG licence](https://www.edrdg.org/edrdg/licence.html)
- Regular-updates clause: "There must be a procedure for regular updating of the data from the most recent versions available" and "Failure to keep the versions up-to-date is a violation of the licence to use the data." — [EDRDG licence](https://www.edrdg.org/edrdg/licence.html)
- SKIP codes: licence page lists "Jack HALPERN: The SKIP codes" as operating "under their own similar Creative Common licence." — [EDRDG licence](https://www.edrdg.org/edrdg/licence.html)
- EDRDG KANJIDIC wiki page: "In 2014 the SKIP codes were placed by Jack Halpern under a CC-SA licence" and are now under Creative Commons Attribution-Noncommercial-Share Alike 4.0 (NC) — [EDRDG KANJIDIC project (local copy)](https://www.edrdg.org/wiki/KANJIDIC_Project.html)
- The licence page states a 25 March 2000 withdrawal of earlier GPL licensing and that the current terms replace all previous statements; it gives no date for the move to CC BY-SA 4.0 (the fetched text did not say when 4.0 was adopted) — [EDRDG licence](https://www.edrdg.org/edrdg/licence.html)
- Hosting: www.edrdg.org/pub/Nihongo/ index exists, says "Dictionary files such as JMdict, Kanjidic, etc. will still be updated daily"; lists JMdict (compressed/uncompressed), JMdict_e variants, JMdict_e_examp, kanjidic2.xml.gz, radkfile/kradfile, 00INDEX; the index page itself did not expose sizes/dates — [Nihongo archive index](https://www.edrdg.org/pub/Nihongo/)
- Files named on the project page: `JMdict.gz` (full multilingual), `JMdict_e.gz` (English glosses only), `JMdict_e_examp.gz` ("the above JMdict file with example sentence pairs from the Tanaka_Corpus") — [JMdict-EDICT project page](https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html)
- Update frequency: "The project's master database is continuously being updated and new versions of the files are generated daily." — [JMdict-EDICT project page](https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html)
- Priority markers (ke_pri/re_pri): news1/2 = in the Mainichi Shimbun "wordfreq" file compiled by Alexandre Girardi; ichi1/2 = "Ichimango goi bunruishuu" (ichi2 demoted for low observed frequencies); spec1/2 = small number of words detected as common but not in other lists; gai1/2 = common loanwords, based on the wordfreq file; nfxx = frequency-of-use ranking band in the wordfreq file — [JMdict-EDICT project page](https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html)
- jmdict-simplified (third-party JSON conversion) latest release 3.6.2+20261005200550 (2026-10-05), JMdict English-only JSON 11 MB (.tgz/.zip), with-examples English 13.5 MB, all-languages 23.9 MB; automated weekly (Monday) releases; "not reviewed by humans"; ~218,863 entries; JSON has id, kanji, kana, sense, common; licence: JMdict/JMnedict under EDRDG licence, Kanjidic CC BY-SA 4.0, RADKFILE/KRADFILE EDRDG licence, code MIT/CC-BY-SA-4.0 — [jmdict-simplified releases](https://github.com/scriptin/jmdict-simplified/releases), [jmdict-simplified README](https://github.com/scriptin/jmdict-simplified)
- KANJIDIC2 download URLs (old http form): `http://www.edrdg.org/kanjidic/kanjidic2.xml.gz`; legacy `kanjidic.gz` and `kanjd212.gz` are EUC-JP — [EDRDG KANJIDIC project](https://www.edrdg.org/wiki/KANJIDIC_Project.html)
- KANJIDIC2 combines KANJIDIC (6,355 kanji), KANJD212 (5,801) and JIS X 0213 additions (952); DTD and XSD provided; status "relatively stable" with periodic updates — [KANJIDIC2 index](https://www.edrdg.org/kanjidic/kanjd2index_legacy.html)
- jlpt field: "The pre-2010 level of the Japanese Language Proficiency Test (JLPT) in which the kanji occurs (1-4)"; no official kanji lists exist for N1-N5 — [EDRDG KANJIDIC project](https://www.edrdg.org/wiki/KANJIDIC_Project.html)
- freq: "The 2,501 most-used characters have a ranking..." from Mainichi Shimbun (newspaper-biased); grade: G1-G6 kyoiku (1,026), G8 (1,110 more jouyou), G9/G10 name kanji; rad_name = radical name in hiragana; stroke_count: first value is accepted count, later ones are common miscounts — [EDRDG KANJIDIC project](https://www.edrdg.org/wiki/KANJIDIC_Project.html)
- RADKFILE/KRADFILE: KRADFILE lines are "kanji : element1 element2 ..." (6,355 JIS X 0208 kanji); RADKFILE is the inverse with stroke counts; KRADFILE2/RADKFILE2 cover 5,801 JIS X 0212 kanji (copyright Jim Rose); encoding EUC-JP; licensed under the EDRDG Licence — [KRADFILE info](https://www.edrdg.org/krad/kradinf.html)

### Inferences
- CC BY-SA 4.0 ShareAlike will plausibly apply to a derived dictionary database shipped in the app (not necessarily to app code); get legal review and publish the derived data under CC BY-SA 4.0 with a link.
- The "regular updating" clause implies the build pipeline must be re-run on a schedule (e.g. CI cron, monthly or more often) and the app must re-ship; record the source file date in the credits screen.
- Strip `query_code` entries of type `skip` (and likely `rad_name` is fine) from KANJIDIC2 at build time to avoid the NC-licensed SKIP data.
- Priority markers (news1/2, ichi1/2, spec1/2, gai1/2, nf01-nf48) are EDRDG-licensed and usable as a frequency proxy; nfxx bands each represent ~500 words by wordfreq rank (only stated generically in fetched text; verify).
- KANJIDIC2 jlpt values are old 4-level system, so they cannot be presented as N1-N5.

### Gaps
- Exact date CC BY-SA 4.0 replaced earlier CC BY-SA version: licence page fetch did not state it.
- Exact current file sizes and generation timestamps for JMdict_e.gz, JMdict_e_examp.gz, kanjidic2.xml.gz at www.edrdg.org/pub/Nihongo/: index page did not expose them (Bash/curl HEAD not used due to plan mode).
- ftp.edrdg.org flakiness and https availability of /pub/Nihongo/ files: not tested (only index page fetched OK).
- DTD structure details (entry/k_ele/r_ele/sense/gloss, ent_seq) and KANJIDIC2 element names beyond the above (reading r_type ja_on/ja_kun, meaning m_lang) not verified from a live source here.
- The WebFetch tool could not reach web.archive.org, so archived EDRDG wiki pages were unavailable.

## 2. KanjiVG (release, licence, attribution, structure, kana coverage, components)

### Takeaway
KanjiVG is CC BY-SA 3.0 (copyright Ulrich Apel) with a release newer than r20250816: tag r20260714. Attribution must be placed in your own copyright header and link to kanjivg.tagaini.net. It does include hiragana (03042.svg あ exists), contradicting a summary of the project site.

### Cited Findings
- Releases listed: r20260714 (July 14, 2026 by tag; release page date text read "July 14, 2025" which is inconsistent with it following r20250816, treat as 2026), r20250816 (Aug 16, 2025), r20250422, r20240807, r20240808 (pre-release), r20230312, r20230110, r20220427 — [KanjiVG releases](https://github.com/KanjiVG/kanjivg/releases)
- r20260714 notes: kvg:position fix, renamed component ID attributes, two new kvg:element values (巜, 俞), missing kvg:elements added to 乞/羽/右, "a generator tool for the components database KRADFILE", added 橅 (06a45.svg); 48 commits since r20250816; 6 assets — [r20260714 release](https://github.com/KanjiVG/kanjivg/releases/tag/r20260714)
- Licence: "copyright Ulrich Apel and released under the Creative Commons Attribution-Share Alike 3.0 licence" — [KanjiVG GitHub](https://github.com/KanjiVG/kanjivg); copyright shown as 2009-2026 on [kanjivg.tagaini.net](https://kanjivg.tagaini.net/)
- File header attribution wording: "Attribution. You must attribute the work by stating your use of KanjiVG in your own copyright header and linking to KanjiVG's website (http://kanjivg.tagaini.net)"; "Share Alike. If you alter, transform, or build upon this work, you may distribute the resulting work only under the same or similar license" — [03042.svg raw](https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/03042.svg)
- Hiragana あ exists as kanji/03042.svg with `kvg:element="あ"` — [03042.svg raw](https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/03042.svg); contradicted by a fetch summary of [kanjivg.tagaini.net](https://kanjivg.tagaini.net/) claiming kana are out of scope (low reliability; verify by listing kanji/ for 0304x-030fx files)
- Release packages: main (non-variant SVGs), all variants, stripped (custom attributes removed), legacy XML (kanjivg-YYYYMMDD.xml.gz); tools kvg-lookup.py, make-index.py, kvg-index.json — [KanjiVG README](https://github.com/KanjiVG/kanjivg/blob/master/README.md)
- SVG custom attributes: kvg:element, kvg:radical, kvg:part, kvg:position, kvg:type, plus stroke numbering — [KanjiVG GitHub](https://github.com/KanjiVG/kanjivg)

### Inferences
- Credits screen should name Ulrich Apel/KanjiVG, link http://kanjivg.tagaini.net, state CC BY-SA 3.0 and link to the licence; any modified SVGs ship under CC BY-SA 3.0 or a compatible licence (4.0 is one-way compatible via the CC compatibility list; check).
- The new KRADFILE generator in r20260714 suggests KanjiVG can supply a component decomposition under CC BY-SA 3.0 itself.

### Gaps
- Asset file names and sizes for r20260714 (page failed to load assets; GitHub API fetch returned 403; GitHub MCP not authorised for this repo).
- Exact release publication date (conflicting text above).
- Detailed attribute semantics (kvg:type values like ㇐, stroke id format `kvg:03042-s1`, kvg:position values) and kana coverage extent (which of hiragana/katakana are present) not verified.
- License of the "kanji-composition" companion data not found; only the KRADFILE generator mention.

## 3. Radical/component alternatives (CHISE IDS, kanji-data, kanjium)

### Takeaway
RADKFILE/KRADFILE (EDRDG licence, CC BY-SA 4.0, EUC-JP) is the cleanest-licensed decomposition source. CHISE-derived IDS data (cjkvi-ids) is GPLv2, a poor fit for a CC BY-SA content bundle. kanji-data (MIT) mixes in WaniKani API data, so is not suitable.

### Cited Findings
- cjkvi-ids: `ids.txt` derived from CHISE ("License follows their terms", GPLv2); `ids-ext-cde.txt` not restricted to GPLv2; all other data GPLv2 — [cjkvi-ids](https://github.com/cjkvi/cjkvi-ids)
- kanji-data (davidluzgouveia): MIT licence; draws from KANJIDIC, Jonathan Waller's JLPT lists (old and new JLPT levels) and the WaniKani API — [kanji-data](https://github.com/davidluzgouveia/kanji-data)

### Inferences
- kanji-data's JLPT levels are sourced from Waller's lists (not official) and WaniKani content is likely not freely licensed, so avoid it as a shipped source.

### Gaps
- kanjium licence: fetch of github.com/Kanjium/kanjium returned 404 (the repo path may be mistaken); not verified.
- CHISE IDS upstream licence text (the GPLv2 claim comes via cjkvi-ids README, not CHISE directly).

## 4. Tatoeba exports (files, jpn_indices, quality filter, licence, audio)

### Takeaway
Exports are on downloads.tatoeba.org, refreshed (all files dated 2026-10-03). Text is CC BY 2.0 FR (a subset CC0); jpn_indices encodes Tanaka-corpus word-to-sentence links. The `~` marker means "good and checked example". Audio is licensed per contributor via sentences_with_audio.csv.

### Cited Findings
- Sizes at 2026-10-03 (uncompressed csv; bz2 in brackets): sentences_detailed.csv 1,408,251,204 B (303,329,630); links.csv 456,900,152 (149,960,216); jpn_indices.csv 17,434,468 (2,863,623); tags.csv 32,602,521 (4,884,569); sentences_CC0.csv 41,857,238 (7,961,008); sentences_with_audio.csv 71,760,061 (6,385,590); users_sentences.csv 98,709,685; sentences.csv 758,729,645; sentences_base.csv 196,127,027; wwwjdic.csv 31,651,602; user_languages.csv 2,420,285; users.csv 5,112,064; tag_metadata.csv 604,756 — [Tatoeba exports index](https://downloads.tatoeba.org/exports/)
- Column formats: sentences_detailed = id, lang, text, username, date added, date last modified; links = sentence id, translation id; tags = sentence id, tag name; sentences_CC0 = id, lang, text, date last modified; sentences_with_audio = sentence id, audio id, username, licence, attribution URL; users_sentences = username, sentence id, review, date added, date last modified — [Tatoeba downloads page](https://tatoeba.org/en/downloads)
- Licence: files under "CC BY 2.0 FR"; part of sentences also under CC0 1.0; audio contributors select their own licences — [Tatoeba downloads page](https://tatoeba.org/en/downloads); Wikipedia notes audio may be CC BY, CC BY-SA, CC BY-NC or no public licence and that translations of CC0 sentences cannot share that licence — [Wikipedia: Tatoeba](https://en.wikipedia.org/wiki/Tatoeba)
- jpn_indices format: Jpn_seq_no TAB Eng_seq_no TAB Japanese sentence TAB English sentence TAB Indices; generated weekly (per EDRDG page) — [EDRDG Sentence-Dictionary Linking](https://www.edrdg.org/wiki/Sentence-Dictionary_Linking.html). The Tatoeba downloads page describes the current file as "Sentence id, Meaning id, Text" (conflict with EDRDG doc; confirm by inspecting the file header) — [Tatoeba downloads page](https://tatoeba.org/en/downloads)
- Index element syntax: `[nn]` = sense number in JMdict; `{}` = form in which the word appears in the sentence (inflected); `()` = kana reading, or `#nnnnnnnn` JMdict sequence number, mandatory only when headwords are ambiguous; `~` = "the sentence pair is a good and checked example of the usage of the word", typically one per sense — [EDRDG Sentence-Dictionary Linking](https://www.edrdg.org/wiki/Sentence-Dictionary_Linking.html)
- Example from search result: `其の[01]{その} 家(いえ)[01] は 可也{かなり} ぼろ屋[01]~ になる[01]{になっている}` — [EDRDG wiki search result](https://www.edrdg.org/wiki/Sentence-Dictionary_Linking.html)
- A search found only that most error-free sentences are not explicitly marked "OK" and users can filter by tags and ratings; no authoritative spec of the users_sentences review column found — [Tatoeba wiki (search result)](https://en.wiki.tatoeba.org/history/show-version/2287)

### Inferences
- Because jpn_indices is derived from the Tanaka Corpus and the `~` flag marks checked examples, a build could join `~`-marked pairs to JMdict ids via `(#nnnnnnnn)` or `[nn]` senses; JMdict_e_examp already bundles such pairs.
- Attribution under CC BY 2.0 FR needs credit to Tatoeba and (conservatively) per-sentence contributor names from sentences_detailed.csv, or a bulk credit page listing contributors; confirm with Tatoeba's attribution guidance.
- Filtering to ja-en pairs: take links.csv rows where one side is lang=jpn and the other eng, using sentences_detailed.csv for lang (per_language/ directory could not be confirmed in the listing; the listing showed no per_language folder).
- Using sentences_CC0.csv would avoid attribution duties but is a small subset (42 MB vs 1.4 GB).

### Gaps
- Official Tatoeba wording of the CC BY 2.0 FR attribution requirement (terms-of-use page fetch returned a login page).
- Review column semantics in users_sentences.csv (values for ok/unsure/not ok) and whether "proofread"/"OK" tag convention is reliable; not verified.
- Per-audio licence values distribution; whether audio can be bundled; not verified.
- Whether a per_language/ directory exists (not seen in the fetched listing, which may be abbreviated).

## 5. Unofficial JLPT vocabulary and kanji lists

### Takeaway
The most common source is Jonathan Waller's tanos.co.uk JLPT Resources, licensed CC BY (per downstream repos) but the website appears defunct, so the original licence page could not be verified live. These lists are explicitly unofficial. The kanji field in KANJIDIC2 holds only the old 1-4 levels.

### Cited Findings
- Waller's lists are CC BY and the JLPT organisation publishes no official vocabulary list — [search result summary](https://git.pvv.ntnu.no/oysteikt/tanos-japanese-word-books/raw/branch/main/README.md); README states "The data is licensed as CC-BY by Jonathan Waller" and calls tanos.co.uk "(now defunct)" — [tanos-japanese-word-books](https://git.pvv.ntnu.no/oysteikt/tanos-japanese-word-books)
- tanos.co.uk and www.tanos.co.uk did not resolve (DNS ENOTFOUND) on 2026-10-06 — fetch error from this session
- yomitan-jlpt-vocab: CC-BY-SA-4.0 repo, data from Waller's page under CC BY, cross-referenced with JMdict entries, replacing rare variants with standard forms; quote: "Official vocabulary lists do not exist for the JLPT, so these lists are essentially an educated guess." — [yomitan-jlpt-vocab](https://github.com/stephenmk/yomitan-jlpt-vocab)
- japanese.io lists attribution as "Jonathan Waller's Japanese Language Proficiency Test Resources page", "tanos.co.uk/jlpt/" — [japanese.io sources](https://www.japanese.io/sources/)
- kanji-data (MIT) carries old and new JLPT level fields sourced from Waller — [kanji-data](https://github.com/davidluzgouveia/kanji-data)

### Inferences
- Most defensible: the Waller lists (CC BY) via a downstream repo that maps to JMdict entries (e.g. yomitan-jlpt-vocab, CC-BY-SA-4.0, aligned to JMdict), shipped with CC BY attribution to Jonathan Waller and a visible "Unofficial / community-estimated levels" label. Because the original site is gone, record the exact repo commit and retain a copy of the CC BY notice.
- For kanji, derive N5-N1 from the same Waller kanji lists via kanji-data-like mapping, but note the MIT repo's WaniKani content must be dropped.

### Gaps
- Not verified: jlpt-vocab-api, "jlpt-word-list" repos, Jisho tags, Wikipedia-derived kanji lists (licences/IDs not checked).
- Not verified: the exact licence text on the original tanos.co.uk page (needs web archive, which this tool could not reach).
- Whether jmdict-simplified has JLPT data: its README as fetched mentions only priority markers, no JLPT tags.

## 6. Kana data (romanisation, KanjiVG kana)

### Takeaway
UCD data is usable under the Unicode License v3 with a notice; KanjiVG has at least hiragana あ. Wikipedia tables and extent of kana in KanjiVG not verified.

### Cited Findings
- Unicode License v3: "this copyright and permission notice appear with all copies of the Data Files or Software, or this copyright and permission notice appear in associated Documentation"; no promotional use of Unicode's name without consent; notice reads (c) 1991-2026 Unicode, Inc. — [Unicode licence](https://www.unicode.org/license.txt)
- KanjiVG contains kanji/03042.svg for hiragana あ — [03042.svg](https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/03042.svg)

### Inferences
- Unicode character names (e.g. HIRAGANA LETTER A, "KA", "SHI") give Hepburn-like romanisation but use "SI"/"TI" style for some kana (e.g. HIRAGANA LETTER SI is shi? Unicode names use SI, TI, TU, HU); verify before relying on them.

### Gaps
- Wikipedia kana tables (CC BY-SA 4.0) not fetched.
- Whether KanjiVG covers all hiragana/katakana including small kana and iteration marks.
- Unicode UCD file used for names (UnicodeData.txt) not checked for romanisation suitability.

## 7. Japanese web fonts (OFL, subsetting tools, sizes)

### Takeaway
Noto Sans JP is SIL OFL 1.1. Subsetting tooling (fonttools pyftsubset) is well documented; full Noto Sans JP is about 4 MB per weight as WOFF, and a custom subset can be about 1.5 MB per weight. Licences for the other nine requested fonts and Google CJK slice details were not verified.

### Cited Findings
- Most Noto fonts, including Noto Sans JP, use SIL Open Font License v1.1 (from search summary, secondary) — [search result](https://github.com/notofonts/noto-cjk) (not directly fetched; low confidence)
- Web-font Noto Sans JP is "roughly 4MB each" per weight; fonttools subsetting with `--layout-features='*'` and `--unicodes` cut ~4MB to ~1.5MB per weight (>50%) — [uhiyama-lab](https://uhiyama-lab.com/en/blog/webdev/optimize-subset-fonttools/)
- pyftsubset options: `--unicodes=`, `--text=`, `--text-file=`, `--glyphs=`, `--gids=`, `--flavor=woff2`, `--no-hinting` (up to 30% smaller), `--layout-features=`, `--drop-tables=`, `--desubroutinize`, `--obfuscate-names` — [fonttools subset docs](https://fonttools.readthedocs.io/en/latest/subset/index.html)

### Inferences
- Because the build pipeline already knows exactly which characters the app displays (from JMdict/KANJIDIC2/Tatoeba subsets), a text-file driven pyftsubset (build-time) would give far smaller files than the 1.5 MB generic subset.
- OFL requires keeping copyright/licence with redistributed fonts and not selling fonts by themselves; reserved font names may force renaming a modified (subsetted) font in some fonts (not verified per font).

### Gaps
- Licences, copyright lines and reserved-font-name status for Noto Serif JP, Zen Kaku Gothic New, BIZ UDPGothic, M PLUS 2, Shippori Mincho, Klee One, Kosugi Maru, Zen Maru Gothic, Murecho: not fetched.
- subfont and glyphhanger: glyphhanger repo URL returned 404; subfont not checked.
- Google Fonts CJK slice ranges and typical per-slice byte sizes (e.g. ~100-200 slices) not verified.
- Google Fonts licence page for Noto Sans JP returned no usable content.
