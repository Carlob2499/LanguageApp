import { get, put } from '@vercel/blob'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * One encrypted snapshot per sync id. The id is derived from the learner's sync key on the
 * device; the server never sees the key or any plaintext. Writes carry an If-Match version so
 * two devices cannot overwrite each other's reviews.
 *
 *   GET  /api/sync?id=<32 hex>              → 200 octet-stream (x-sync-version) | 404
 *   PUT  /api/sync?id=<32 hex>  If-Match: n → 204 | 409 {version} | 413 | 503 {error}
 */
const ID = /^[0-9a-f]{32}$/
const MAX_BYTES = 8 * 1024 * 1024

function pathFor(id: string): string {
  return `sync/${id}.bin`
}

function readVersion(bytes: Uint8Array): number {
  return bytes.length >= 16 ? new DataView(bytes.buffer, bytes.byteOffset).getUint32(0) : 0
}

async function current(id: string): Promise<Uint8Array | undefined> {
  try {
    const result = await get(pathFor(id), { access: 'private', useCache: false })
    if (!result || result.statusCode !== 200 || !result.stream) return undefined
    return new Uint8Array(await new Response(result.stream).arrayBuffer())
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store')
  if (!process.env['BLOB_READ_WRITE_TOKEN']) {
    res.status(503).json({ error: 'unconfigured' })
    return
  }
  const id = typeof req.query['id'] === 'string' ? req.query['id'] : ''
  if (!ID.test(id)) {
    res.status(400).json({ error: 'bad-id' })
    return
  }

  if (req.method === 'GET') {
    const bytes = await current(id)
    if (!bytes) {
      res.status(404).json({ error: 'none' })
      return
    }
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('x-sync-version', String(readVersion(bytes)))
    res.status(200).send(Buffer.from(bytes))
    return
  }

  if (req.method === 'PUT') {
    const expected = Number.parseInt(String(req.headers['if-match'] ?? '0'), 10)
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
    const existing = await current(id)
    const version = existing ? readVersion(existing) : 0
    if (version !== expected || readVersion(bytes) !== version + 1) {
      res.status(409).json({ version })
      return
    }
    await put(pathFor(id), Buffer.from(bytes), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/octet-stream',
    })
    res.status(204).end()
    return
  }

  res.setHeader('Allow', 'GET, PUT')
  res.status(405).json({ error: 'method' })
}
