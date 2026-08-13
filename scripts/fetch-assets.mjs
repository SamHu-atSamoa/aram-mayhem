/**
 * fetch-assets.mjs
 *
 * Downloads every icon referenced by the built dataset into public/img/, so the
 * app serves them from its own origin instead of hot-linking Riot's CDN.
 *
 * Why this matters: the champion grid renders 173 icons at once. Fetching those
 * cross-origin costs a DNS lookup, a TLS handshake and 173 round trips to a CDN
 * that may be far away — the dominant cost of loading the page. Served as Worker
 * assets they come off Cloudflare's edge near the visitor, over one multiplexed
 * connection, already cached.
 *
 * Runs after `build-data` and before `vite build`, reading the manifest that
 * build-data emits. Already-downloaded files are skipped, so repeat builds are
 * nearly free.
 *
 * Failures are not fatal: anything that cannot be fetched has its dataset
 * reference rewritten back to the upstream URL, so the site still shows the
 * icon — just more slowly.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = resolve(root, 'public/data')
const manifestPath = resolve(dataDir, 'asset-manifest.json')

if (!existsSync(manifestPath)) {
  console.error('fetch-assets: no asset manifest — run `npm run data` first')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const entries = Object.entries(manifest)
const CONCURRENCY = Number(process.env.ASSET_CONCURRENCY || 12)

let downloaded = 0
let skipped = 0
const failed = {}

async function fetchOne([localPath, remoteUrl]) {
  const dest = resolve(root, 'public', localPath.replace(/^\//, ''))

  if (existsSync(dest) && statSync(dest).size > 0) {
    skipped++
    return
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(remoteUrl, {
        headers: { 'user-agent': 'aram-mayhem/1.0 (build-time asset fetch)' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (!buf.length) throw new Error('empty body')
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, buf)
      downloaded++
      return
    } catch (err) {
      if (attempt === 2) {
        failed[localPath] = remoteUrl
        console.warn(`  ! ${localPath} <- ${remoteUrl}: ${err.message}`)
      } else {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }
}

console.log(`fetch-assets: ${entries.length} icons`)

let cursor = 0
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, entries.length) }, async () => {
    while (cursor < entries.length) await fetchOne(entries[cursor++])
  })
)

/* Point anything that failed back at its upstream URL so it still renders. */
const failures = Object.keys(failed)
if (failures.length) {
  const failedSet = new Set(failures)
  const rewrite = (file) => {
    const p = resolve(dataDir, file)
    if (!existsSync(p)) return
    let text = readFileSync(p, 'utf8')
    let touched = false
    for (const localPath of failedSet) {
      if (text.includes(`"${localPath}"`)) {
        text = text.split(`"${localPath}"`).join(`"${failed[localPath]}"`)
        touched = true
      }
    }
    if (touched) writeFileSync(p, text)
  }
  rewrite('champions.json')
  rewrite('augments.json')
  rewrite('items.json')
  for (const f of readdirSync(resolve(dataDir, 'heroes'))) rewrite(`heroes/${f}`)
  console.warn(`fetch-assets: ${failures.length} icon(s) left pointing upstream`)
}

const total = Object.entries(manifest).reduce((bytes, [localPath]) => {
  const dest = resolve(root, 'public', localPath.replace(/^\//, ''))
  return existsSync(dest) ? bytes + statSync(dest).size : bytes
}, 0)

console.log(
  `fetch-assets: ${downloaded} downloaded, ${skipped} cached, ${failures.length} failed ` +
    `(${(total / 1024 / 1024).toFixed(1)} MB local)`
)
