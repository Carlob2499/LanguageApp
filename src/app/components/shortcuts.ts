/** Every keyboard shortcut the app answers to, for the palette's help view. */
export const SHORTCUTS: Array<{ keys: string; does: string; where: string }> = [
  { keys: '⌘K / Ctrl+K', does: 'Open this palette', where: 'Everywhere' },
  { keys: '?', does: 'Keyboard shortcuts', where: 'Everywhere' },
  { keys: 'Space', does: 'Reveal the answer', where: 'Review' },
  { keys: '1 2 3 4', does: 'Again · Hard · Good · Easy', where: 'Review' },
  { keys: 'Enter', does: 'Accept the suggested grade', where: 'Review' },
  { keys: 'U', does: 'Undo the last grade', where: 'Review' },
  { keys: 'Esc', does: 'Leave the session, close dialogs', where: 'Everywhere' },
  { keys: '/', does: 'Search', where: 'Library' },
  { keys: 'J / K', does: 'Next / previous item', where: 'Library' },
  { keys: 'Enter', does: 'Open the selected kanji', where: 'Library' },
  { keys: 'S · T · A', does: 'Strokes · Trace · Assemble', where: 'Kanji' },
  { keys: 'R', does: 'Replay the strokes', where: 'Kanji' },
]
