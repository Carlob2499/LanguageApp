import { createHash } from 'node:crypto'
import { createWriteStream, mkdirSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { dirname } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'

// Honour HTTPS_PROXY / NO_PROXY the way curl does (Node's fetch ignores them by default).
setGlobalDispatcher(new EnvHttpProxyAgent())

export interface Downloaded {
  bytes: number
  sha256: string
  lastModified: string | null
  downloadedAt: string
}

export async function download(url: string, dest: string): Promise<Downloaded> {
  mkdirSync(dirname(dest), { recursive: true })
  const res = await fetch(url, {
    headers: {
      'user-agent': 'kintsugi-data-pipeline (+https://github.com/Carlob2499/LanguageApp)',
    },
  })
  if (!res.ok || !res.body) throw new Error(`GET ${url} -> ${res.status}`)
  const hash = createHash('sha256')
  const nodeStream = Readable.fromWeb(res.body)
  nodeStream.on('data', (chunk: Buffer) => hash.update(chunk))
  await pipeline(nodeStream, createWriteStream(dest))
  const { size } = await stat(dest)
  return {
    bytes: size,
    sha256: hash.digest('hex'),
    lastModified: res.headers.get('last-modified'),
    downloadedAt: new Date().toISOString(),
  }
}
