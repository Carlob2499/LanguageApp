// Fails if shipped source or docs contain placeholder text. Cross-platform (Node only).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const scanDirs = [
  'src',
  'api',
  'public',
  'e2e',
  'index.html',
  'README.md',
  'REAL-DEVICE-CHECKLIST.md',
]
const skipDirs = new Set(['node_modules', 'dist', 'dev-dist', 'packs', 'icons'])
const patterns = [/lorem/i, /\bTODO\b/, /\bTBD\b/, /placeholder(?!=)/i]
// `placeholder=` is the HTML attribute, which is legitimate copy for inputs.
const allowFiles = new Set(['scripts/check-placeholders.mjs'])

const offenders = []
function walk(path) {
  let info
  try {
    info = statSync(path)
  } catch {
    return
  }
  if (info.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (!skipDirs.has(entry)) walk(join(path, entry))
    }
    return
  }
  const rel = relative(root, path).replaceAll('\\', '/')
  if (allowFiles.has(rel)) return
  if (!/\.(ts|tsx|js|mjs|css|html|md|json|webmanifest|svg)$/.test(rel)) return
  const text = readFileSync(path, 'utf8')
  text.split('\n').forEach((line, i) => {
    for (const re of patterns) {
      if (re.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`)
    }
  })
}
for (const dir of scanDirs) walk(join(root, dir))

if (offenders.length > 0) {
  console.error('Placeholder text found in shipped files:')
  for (const line of offenders) console.error('  ' + line)
  process.exit(1)
}
console.log('No placeholder text in shipped files.')
