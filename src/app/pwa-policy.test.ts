import { describe, expect, it } from 'vitest'

import { updateOfferAllowed } from './pwa-policy'

describe('updateOfferAllowed', () => {
  it('waits until no review or placement is open', () => {
    expect(updateOfferAllowed('/review', true)).toBe(false)
    expect(updateOfferAllowed('/placement', true)).toBe(false)
    expect(updateOfferAllowed('/', true)).toBe(true)
    expect(updateOfferAllowed('/', false)).toBe(false)
  })
})
