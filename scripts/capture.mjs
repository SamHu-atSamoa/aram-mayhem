/**
 * capture.mjs
 *
 * Re-pulls the upstream source data and writes it into data/raw/, ready for
 * build-data.mjs. Runs on a machine with outbound internet access — locally, or
 * on the GitHub Actions runner via .github/workflows/deploy.yml.
 *
 *   node scripts/capture.mjs
 *
 * Deliberately gentle on the upstream API: small concurrency, a pause between
 * requests, retries with backoff. One run makes ~180 requests, which is why the
 * refresh is scheduled daily rather than performed per visitor.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rawDir = resolve(root, 'data/raw')

const API = process.env.ARAM_API_BASE || 'https://test.cchappy.top'
const SITE = process.env.ARAM_SITE_ORIGIN || 'https://cchappy.top'
const DDRAGON = 'https://ddragon.leagueoflegends.com'
const CDRAGON = 'https://raw.communitydragon.org'

const CONCURRENCY = Number(process.env.ARAM_CONCURRENCY || 4)
const DELAY_MS = Number(process.env.ARAM_DELAY_MS || 150)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let requestCount = 0

async function getJson(url, { retries = 4, referer = true } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      requestCount++
      const res = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'arammayhem-rebuild/1.0 (scheduled data refresh)',
          ...(referer && url.startsWith(API) ? { referer: SITE + '/', origin: SITE } : {}),
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (attempt === retries) throw new Error(`${url} failed: ${err.message}`)
      await sleep(800 * (attempt + 1))
    }
  }
}

/** Map over items with bounded concurrency and a courtesy delay. */
async function mapLimit(items, fn) {
  const results = new Array(items.length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++
        results[i] = await fn(items[i], i)
        await sleep(DELAY_MS)
      }
    })
  )
  return results
}

/* ------------------------------------------------------------------- main */

console.log(`capture: source ${API}`)

// 1. champion index
const bootstrap = await getJson(`${API}/api/public/hextech-aram/heroes/bootstrap`)
const championIds = bootstrap.data.champions.map((c) => c.id)
console.log(`  champions: ${championIds.length}`)

// 2. per-champion builds
const heroes = {}
const failed = []
await mapLimit(championIds, async (id) => {
  try {
    const r = await getJson(`${API}/api/public/hextech-aram/heroes/${id}`)
    if (r?.success && r.data) heroes[id] = r.data
    else failed.push(id)
  } catch {
    failed.push(id)
  }
})
if (failed.length) {
  console.log(`  retrying ${failed.length} champion(s): ${failed.join(', ')}`)
  for (const id of failed.splice(0)) {
    try {
      const r = await getJson(`${API}/api/public/hextech-aram/heroes/${id}`, { retries: 5 })
      if (r?.success && r.data) heroes[id] = r.data
      else failed.push(id)
    } catch {
      failed.push(id)
    }
    await sleep(400)
  }
}
if (failed.length) {
  throw new Error(`could not fetch ${failed.length} champion(s): ${failed.join(', ')}`)
}
console.log(`  builds: ${Object.keys(heroes).length}`)

// 3. guides (paged)
const guides = await getJson(`${API}/api/public/hextech-aram/guides/bootstrap`)
const guidesPage2 = await getJson(
  `${API}/api/public/hextech-aram/guides/bootstrap?page=2&pageSize=10`
)
const guideTotal = guides.data.total ?? guides.data.list.length
console.log(`  guides: ${guides.data.list.length + guidesPage2.data.list.length} of ${guideTotal}`)

// 4. message board (paged until exhausted)
const messagesAll = []
for (let page = 1; page <= 20; page++) {
  const r = await getJson(`${API}/api/public/message-board/messages?page=${page}&pageSize=50`)
  const list = r?.data?.list || []
  messagesAll.push(...list)
  if (list.length < 50) break
  await sleep(DELAY_MS)
}
console.log(`  message threads: ${messagesAll.length}`)

// 5. announcements
const announcements = await getJson(`${API}/api/public/site-announcements/active-list`).catch(
  () => null
)

// 6. Riot Data Dragon — official English champion and item text
const versions = await getJson(`${DDRAGON}/api/versions.json`)
const ddVersion = versions[0]
const [championData, itemData] = await Promise.all([
  getJson(`${DDRAGON}/cdn/${ddVersion}/data/en_US/champion.json`),
  getJson(`${DDRAGON}/cdn/${ddVersion}/data/en_US/item.json`),
])
console.log(`  data dragon ${ddVersion}: ${Object.keys(championData.data).length} champions`)

// 7. CommunityDragon — official English augment names
const cherryList = await getJson(
  `${CDRAGON}/latest/plugins/rcp-be-lol-game-data/global/default/v1/cherry-augments.json`
)
const cherryById = {}
for (const c of cherryList) if (c.id > 0) cherryById[c.id] = c
console.log(`  augment names: ${Object.keys(cherryById).length}`)

/* ------------------------------------------------------------------ write */

mkdirSync(rawDir, { recursive: true })

const capturedAt = new Date().toISOString().slice(0, 10)

writeFileSync(
  resolve(rawDir, 'cchappy-data-full.json'),
  JSON.stringify({
    capturedAt,
    source: 'upstream public API + Riot ddragon/cdragon',
    bootstrap,
    heroes,
    guides,
    announcements,
    emergency: null,
    messages: { data: { list: messagesAll.slice(0, 50) } },
    english: {
      version: ddVersion,
      champions: championData.data,
      items: itemData.data,
      arena: { augments: [] },
    },
  })
)

writeFileSync(
  resolve(rawDir, 'cchappy-extra.json'),
  JSON.stringify({
    guidesPage2,
    messagesAll,
    heroIconMap: guides.data.heroIconMap || {},
  })
)

writeFileSync(resolve(rawDir, 'cherry_by_id.json'), JSON.stringify(cherryById))

console.log(`capture complete (${requestCount} requests) — captured ${capturedAt}`)
