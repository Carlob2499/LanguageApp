import { describe, expect, it } from 'vitest'

import { msUntil } from './reminders'

describe('msUntil', () => {
  it('counts to later today, or to tomorrow once the time has passed', () => {
    const now = new Date(2026, 9, 6, 18, 30, 0, 0)
    expect(msUntil('19:00', now)).toBe(30 * 60_000)
    expect(msUntil('18:00', now)).toBe((23 * 60 + 30) * 60_000)
    expect(msUntil('18:30', now)).toBe(24 * 60 * 60_000)
  })
})
