# Real-device checklist

Automated tests run Chromium and WebKit in CI, which is close to iOS Safari but not the same thing. These checks need a real iPhone (daily-review device) and a desktop browser. Each takes a minute or two. Note anything that fails in an issue, with the device, OS version and a screenshot.

## Before you start

- [ ] The app is live on Vercel over HTTPS (see HANDOFF.md, step 1).
- [ ] iPhone on iOS 18 or later, Safari. Settings → Accessibility → Spoken Content → Voices → Japanese has a voice downloaded (Kyoko or Otoya) for the audio checks.

## Install and first run (iPhone)

- [ ] Open the site in Safari. The headline "Mistakes, repaired in gold." appears at once, before the kanji 金 draws itself.
- [ ] Share → Add to Home Screen. The icon is the lacquer-and-gold mark, the name is Kintsugi.
- [ ] Launch from the Home Screen: no Safari chrome, the status bar sits over the lacquer background, nothing is hidden under the notch or the home indicator.
- [ ] Onboarding: answer "Yes" to kana, pick N5 by hand, 10 a day, Begin. Today shows "Nothing due. Meet something new?".

## Review session (iPhone)

- [ ] Start a session. Tap Reveal; the kanji writes itself in gold. Swipe right: the card flies off and the next one arrives. Swipe left on a later card: a crack draws across it.
- [ ] Undo (top right) brings the last card back with its previous state.
- [ ] A word card speaks the reading when revealed (needs the Japanese voice). Settings → Speak Japanese → Off silences it.
- [ ] Typed-reading card: the iOS keyboard romaji input converts to kana; a wrong answer shows "Not quite".
- [ ] Rotate to landscape and back mid-card: nothing jumps or resets.
- [ ] Lock the phone mid-session for a minute, unlock: the session continues at the same card.

## Writing and tracing (iPhone)

- [ ] Open a kanji (Library → 日) → Trace. Draw each stroke with a finger: each correct stroke turns gold, the page does not scroll while drawing, a backwards stroke says "Right shape, wrong direction."
- [ ] Assemble: the lacquer pieces float apart and come together; dragging sideways scrubs them; it stays smooth (no stutter) for ten seconds.
- [ ] Settings → Accessibility → Motion → Reduce Motion on: Assemble shows the flat parts diagram instead, strokes appear without animation, no ambient gold dust moves.

## Offline and storage (iPhone)

- [ ] With the app installed and used once online, turn on Airplane Mode, launch from the Home Screen, finish a short session, force-quit, relaunch: the reviews are still counted on Today.
- [ ] Settings → Storage shows usage, and "The browser has agreed to keep this site's data" after installing.
- [ ] Settings → Save a backup → the share sheet offers Save to Files. Restore from that file on a fresh install brings the progress back.

## Text size and themes (iPhone)

- [ ] iOS Settings → Display → Text Size at the largest standard size: Today, Review and Settings still fit, nothing overlaps the tab bar.
- [ ] Settings → Japanese text size A++: kanji and furigana grow together.
- [ ] Theme Auto follows iOS Light/Dark (switch in Control Centre while the app is open); Lacquer and Paper force each one.

## Sync (needs the Blob store, HANDOFF.md step 2)

- [ ] Phone: Settings → Turn on sync. A key and QR code appear and the status says "Synced".
- [ ] Desktop browser: scan the QR with the phone camera on the desktop, or type the key under "I have a key". After Join, the desktop shows the phone's progress.
- [ ] Review two cards on desktop, Sync now; then Sync now on the phone: Today on the phone counts them.

## Update flow

- [ ] After a new deployment, keep the installed app open on Today: within a minute a "A new version of Kintsugi is ready" note offers Restart now / Later.
- [ ] Start a review before the note appears: it does not appear during the session, only after you return to Today.

## Desktop (Chrome, Safari or Firefox at 1440 px)

- [ ] ⌘K / Ctrl+K opens the palette; typing 時 and Enter opens the kanji; ? shows the shortcut sheet.
- [ ] Library: the split view shows the selected kanji alongside; J/K move; / searches.
- [ ] A full session with the keyboard only: Space, 1–4, U, Esc.
- [ ] Reminder: Settings → Reminder → Allow notifications, set the time two minutes ahead, keep the tab open: a notification arrives.

## Motion, sound and typing

- [ ] The opening plays once per visit, lands near three seconds, and any tap skips it.
- [ ] Sound is audible with the silent switch off and silent with it on. Settings → Sound off mutes everything.
- [ ] Right answers stamp a seal on the tile's corner with a koto note; a streak of three, five and ten shows the combo text; five and ten add a drum.
- [ ] A missed card cracks quietly with a soft tick, with no shake and no red flash.
- [ ] Settings → Motion → Gentle removes the brush wipe, combo text and drum but keeps the seals and gold. Reduce Motion in iOS settings turns animation off.
- [ ] The session-complete bowl assembles and the gold seams run in under four seconds.
- [ ] On a reading card, typing in romaji shows live kana below the field; switching to Kana accepts a Japanese keyboard.
