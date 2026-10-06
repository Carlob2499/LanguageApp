// Downloads every upstream source into data/raw and records what was fetched.
import { join } from 'node:path'

import { RAW_DIR, writeJson } from './lib/fs'
import { download } from './lib/http'
import { SOURCES } from './sources'

interface FetchRecord {
  id: string
  url: string
  file: string
  bytes: number
  sha256: string
  lastModified: string | null
  downloadedAt: string
}

const records: FetchRecord[] = []
for (const source of SOURCES) {
  const dest = join(RAW_DIR, source.file)
  process.stdout.write(`fetch ${source.id.padEnd(16)} ${source.url}\n`)
  const result = await download(source.url, dest)
  records.push({ id: source.id, url: source.url, file: source.file, ...result })
  process.stdout.write(
    `      ${(result.bytes / 1024).toFixed(0).padStart(8)} KB  sha256 ${result.sha256.slice(0, 12)}  ${result.lastModified ?? ''}\n`,
  )
}
writeJson(join(RAW_DIR, 'fetch-log.json'), { fetchedAt: new Date().toISOString(), records })
console.log(`Fetched ${records.length} sources into ${RAW_DIR}.`)
