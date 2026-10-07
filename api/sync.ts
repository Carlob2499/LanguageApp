import { createHash, timingSafeEqual } from 'node:crypto'

import { get, put } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * One encrypted snapshot per sync id. The id, the AES key and a write token are all derived from
 * the learner's sync key on the device; the server never sees the key or any plaintext. It keeps
 * a hash of the write token next to the snapshot and requires the token for every later write,
 * so knowing an id alone is not enough to replace someone's data. Writes are conditional on the
 * blob's ETag, so two devices cannot silently overwrite each other.
 *
 *   GET /api/sync  x-sync-id               → 200 octet-stream (x-sync-version) | 404
 *   PUT /api/sync  x-sync-id, x-sync-auth,
 *                  If-Match: <version>     → 204 | 403 | 409 {version} | 413 | 503 {error}
 *
 * Rate limiting belongs in front of the function (Vercel Firewall rule on /api/sync).
 */
const ID = /^[0-9a-f]{32}$/
const AUTH = /^[0-9a-f]{64}$/
/** Vercel caps function request bodies at 4.5 MB; snapshots are far smaller. */
const MAX_BYTES = 4 * 1024 * 1024

const dataPath = (id: string) => `sync/${id}.bin`
const authPath = (id: string) => `sync/${id}.auth`

function readVersion(bytes: Uint8Array): number {
  return bytes.length >= 16 ? new DataView(bytes.buffer, bytes.byteOffset).getUint32(0) : 0
}

async function read(path: string): Promise<{ bytes: Uint8Array; etag: string } | undefined> {
  try {
    const result = await get(path, { access: 'private', useCache: false })
    if (!result || result.statusCode !== 200 || !result.stream) return undefined
    return {
      bytes: new Uint8Array(await new Response(result.stream).arrayBuffer()),
      etag: result.blob.etag,
    }
  } catch (error) {
    if ((error as { name?: string }).name === 'BlobNotFoundError') return undefined
    throw error
  }
}

async function body(req: VercelRequest): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer)
    size += buf.length
    if (size > MAX_BYTES) throw Object.assign(new Error('too large'), { status: 413 })
    chunks.push(buf)
  }
  return new Uint8Array(Buffer.concat(chunks))
}

function header(req: VercelRequest, name: string): string {
  const v = req.headers[name]
  return typeof v === 'string' ? v : ''
}

const sha256 = (s: string) => createHash('sha256').update(s).digest()

function isPrecondition(error: unknown): boolean {
  const name = (error as { name?: string }).name ?? ''
  return (
    name === 'BlobPreconditionFailedError' || /precondition|already exists/i.test(String(error))
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store')
  if (!process.env['BLOB_READ_WRITE_TOKEN']) {
    res.status(503).json({ error: 'unconfigured' })
    return
  }
  const id = header(req, 'x-sync-id')
  if (!ID.test(id)) {
    res.status(400).json({ error: 'bad-id' })
    return
  }

  if (req.method === 'GET') {
    const current = await read(dataPath(id))
    if (!current) {
      res.status(404).json({ error: 'none' })
      return
    }
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('x-sync-version', String(readVersion(current.bytes)))
    res.status(200).send(Buffer.from(current.bytes))
    return
  }

  if (req.method === 'PUT') {
    const auth = header(req, 'x-sync-auth')
    if (!AUTH.test(auth)) {
      res.status(403).json({ error: 'auth' })
      return
    }
    const expected = Number.parseInt(header(req, 'if-match') || '0', 10)
    let bytes: Uint8Array
    try {
      bytes = await body(req)
    } catch (error) {
      res.status((error as { status?: number }).status ?? 400).json({ error: 'body' })
      return
    }
    if (bytes.length < 16) {
      res.status(400).json({ error: 'bad-payload' })
      return
    }

    // The first write for an id stores the token's hash; later writes must present the token.
    const storedAuth = await read(authPath(id))
    if (storedAuth) {
      const want = Buffer.from(storedAuth.bytes)
      const have = sha256(auth)
      if (want.length !== have.length || !timingSafeEqual(want, have)) {
        res.status(403).json({ error: 'auth' })
        return
      }
    }

    const current = await read(dataPath(id))
    const version = current ? readVersion(current.bytes) : 0
    if (version !== expected || readVersion(bytes) !== version + 1) {
      res.status(409).json({ version })
      return
    }
    try {
      if (!storedAuth) {
        await put(authPath(id), sha256(auth), {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: 'application/octet-stream',
        })
      }
      await put(dataPath(id), Buffer.from(bytes), {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/octet-stream',
        ...(current ? { allowOverwrite: true, ifMatch: current.etag } : { allowOverwrite: false }),
      })
    } catch (error) {
      if (isPrecondition(error)) {
        res.status(409).json({ version })
        return
      }
      throw error
    }
    res.status(204).end()
    return
  }

  res.setHeader('Allow', 'GET, PUT')
  res.status(405).json({ error: 'method' })
}
