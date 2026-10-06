// Verifies that the content packs on disk match public/packs/ja/provenance.json.
// Until the first pack build exists, this reports and exits cleanly so the scaffold CI stays honest.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const packsDir = join('public', 'packs', 'ja')
const manifestPath = join(packsDir, 'provenance.json')

interface ManifestFile {
  path: string
  sha256: string
  records: number
}

if (!existsSync(manifestPath)) {
  console.log(
    `No provenance manifest at ${manifestPath} yet. Run "npm run data:update" to build the packs.`,
  )
  process.exit(0)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { files: ManifestFile[] }
let failures = 0
for (const file of manifest.files) {
  const full = join(packsDir, file.path)
  if (!existsSync(full)) {
    console.error(`MISSING  ${file.path}`)
    failures++
    continue
  }
  const sha = createHash('sha256').update(readFileSync(full)).digest('hex')
  if (sha !== file.sha256) {
    console.error(`CHANGED  ${file.path}`)
    failures++
  } else {
    console.log(`ok       ${file.path} (${file.records} records)`)
  }
}
if (failures > 0) {
  console.error(
    `${failures} pack file(s) disagree with provenance.json. Re-run "npm run data:build".`,
  )
  process.exit(1)
}
console.log('All packs match provenance.json.')
