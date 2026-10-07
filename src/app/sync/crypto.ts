/**
 * Sync keys and encryption. The sync key never leaves the device unencrypted: the server sees a
 * blob id derived from it and ciphertext, nothing else. Everything here is WebCrypto.
 */

export const KEY_BYTES = 16
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford base32: no I, L, O, U
const INFO_AES = 'kintsugi-sync-v1/aes'
const INFO_ID = 'kintsugi-sync-v1/id'
const INFO_AUTH = 'kintsugi-sync-v1/auth'

export function generateSyncKey(): Uint8Array {
  const bytes = new Uint8Array(KEY_BYTES)
  crypto.getRandomValues(bytes)
  return bytes
}

/** 128 bits as 26 base32 characters in groups of four or five, easy to read out loud. */
export function encodeKey(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out.match(/.{1,4}/g)?.join('-') ?? out
}

/** Accepts the printed form with any case, spaces or hyphens, and the usual misreadings. */
export function decodeKey(text: string): Uint8Array | undefined {
  const clean = text
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  if (clean.length !== 26) return undefined
  const out = new Uint8Array(KEY_BYTES)
  let bits = 0
  let value = 0
  let i = 0
  for (const ch of clean) {
    const v = ALPHABET.indexOf(ch)
    if (v < 0) return undefined
    value = (value << 5) | v
    bits += 5
    if (bits >= 8) {
      if (i < KEY_BYTES) out[i++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }
  return i === KEY_BYTES ? out : undefined
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface DerivedKeys {
  aes: CryptoKey
  /** Blob id on the server: 32 hex characters derived from the key, not the key itself. */
  id: string
  /** Write token: the server keeps only its hash and requires it for every upload after the first. */
  auth: string
}

export async function deriveKeys(syncKey: Uint8Array): Promise<DerivedKeys> {
  const base = await crypto.subtle.importKey('raw', syncKey.slice(), 'HKDF', false, [
    'deriveKey',
    'deriveBits',
  ])
  const enc = new TextEncoder()
  const aes = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(INFO_AES) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  const idBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(INFO_ID) },
    base,
    128,
  )
  const authBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(INFO_AUTH) },
    base,
    256,
  )
  return { aes, id: hex(idBits), auth: hex(authBits) }
}

/** Wire format: 4-byte big-endian version, 12-byte IV, AES-GCM ciphertext with tag. */
function aad(version: number, id: string): Uint8Array<ArrayBuffer> {
  // The version and blob id are bound into the ciphertext, so an old snapshot cannot be replayed
  // under a newer version number or moved to another id.
  return new TextEncoder().encode(`${id}:${version}`)
}

export async function seal(
  aes: CryptoKey,
  version: number,
  plaintext: Uint8Array,
  id = '',
): Promise<Uint8Array> {
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aad(version, id) },
      aes,
      plaintext.slice(),
    ),
  )
  const out = new Uint8Array(4 + 12 + ct.length)
  new DataView(out.buffer).setUint32(0, version)
  out.set(iv, 4)
  out.set(ct, 16)
  return out
}

export function readVersion(payload: Uint8Array): number {
  if (payload.length < 16) throw new Error('Sync payload is too short')
  return new DataView(payload.buffer, payload.byteOffset).getUint32(0)
}

export async function open(aes: CryptoKey, payload: Uint8Array, id = ''): Promise<Uint8Array> {
  const iv = payload.slice(4, 16)
  const ct = payload.slice(16)
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: aad(readVersion(payload), id) },
      aes,
      ct,
    ),
  )
}
