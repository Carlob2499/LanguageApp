import { createReadStream } from 'node:fs'

import unbzip2 from 'unbzip2-stream'

/** Reads a whole .bz2 text file into a string. The Tatoeba per-language exports are a few MB. */
export function readBz2Text(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    createReadStream(path)
      .pipe(unbzip2())
      .on('data', (chunk: Buffer) => chunks.push(chunk))
      .on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      .on('error', reject)
  })
}
