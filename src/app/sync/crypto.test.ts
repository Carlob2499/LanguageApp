// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  decodeKey,
  deriveKeys,
  encodeKey,
  generateSyncKey,
  open,
  readVersion,
  seal,
} from './crypto'

describe('sync keys', () => {
  it('prints 128 bits as 26 readable characters and reads them back, forgiving case and misreads', () => {
    const key = generateSyncKey()
    const text = encodeKey(key)
    expect(text.replace(/-/g, '')).toHaveLength(26)
    expect(decodeKey(text)).toEqual(key)
    expect(decodeKey(text.toLowerCase().replace(/-/g, ' '))).toEqual(key)
    expect(decodeKey('too short')).toBeUndefined()
    const withO = text.replace(/0/g, 'O')
    expect(decodeKey(withO)).toEqual(key)
  })

  it('derives a stable blob id and an AES key that round-trips, and nothing from a wrong key', async () => {
    const key = generateSyncKey()
    const a = await deriveKeys(key)
    const b = await deriveKeys(key)
    expect(a.id).toBe(b.id)
    expect(a.id).toMatch(/^[0-9a-f]{32}$/)
    expect(a.auth).toMatch(/^[0-9a-f]{64}$/)
    expect(a.auth).not.toBe(a.id)
    const payload = await seal(a.aes, 7, new TextEncoder().encode('{"v":1}'), a.id)
    expect(readVersion(payload)).toBe(7)
    expect(new TextDecoder().decode(await open(b.aes, payload, a.id))).toBe('{"v":1}')
    // Version and id are authenticated: a bumped version or another id fails to open.
    const bumped = payload.slice()
    new DataView(bumped.buffer).setUint32(0, 8)
    await expect(open(a.aes, bumped, a.id)).rejects.toBeDefined()
    await expect(open(a.aes, payload, 'f'.repeat(32))).rejects.toBeDefined()
    const other = await deriveKeys(generateSyncKey())
    expect(other.id).not.toBe(a.id)
    await expect(open(other.aes, payload, a.id)).rejects.toBeDefined()
  })
})
