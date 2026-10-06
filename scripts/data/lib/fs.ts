import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export const RAW_DIR = 'data/raw'
export const PACKS_DIR = 'public/packs/ja'

export function sha256(buffer: Buffer | string): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export function writeJson(path: string, value: unknown): { bytes: number; sha256: string } {
  mkdirSync(dirname(path), { recursive: true })
  const body = JSON.stringify(value)
  writeFileSync(path, body)
  return { bytes: Buffer.byteLength(body), sha256: sha256(body) }
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}
