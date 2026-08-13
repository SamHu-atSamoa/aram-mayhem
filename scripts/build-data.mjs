/**
 * build-data.mjs
 *
 * Transforms the raw captured snapshot (Chinese) into the English dataset the
 * app consumes at runtime.
 *
 *   data/raw/cchappy-data-full.json   snapshot of the public API + Riot ddragon
 *   data/raw/cchappy-extra.json       guides page 2 + full message board
 *   data/raw/cherry_by_id.json        official English augment names (CommunityDragon)
 *   data/raw/translations.json        human-reviewed translations of the CN prose
 *
 * Output: public/data/*.json  (one index + one file per champion)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const raw = (f) => JSON.parse(readFileSync(resolve(root, 'data/raw', f), 'utf8'))

const snapshot = raw('cchappy-data-full.json')
const extra = raw('cchappy-extra.json')
const cherry = raw('cherry_by_id.json')
const tr = raw('translations.json')

const enChampions = snapshot.english.champions
const enItems = snapshot.english.items
const DDRAGON_VERSION = snapshot.english.version

/* ------------------------------------------------------------------ assets
 * Icons are served from Riot's own CDNs rather than being hotlinked from the
 * original site: Data Dragon for champion portraits and item icons,
 * CommunityDragon for ARAM augment icons.
 */
const DD = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img`
const CDRAGON = 'https://raw.communitydragon.org/latest/game'

/* Icons are served from our own origin rather than hot-linked. The champion
 * grid alone is 173 images: fetching those cross-origin from Riot's CDN is the
 * single slowest thing the page can do, especially far from its edges. Instead
 * we emit local paths here, record the upstream source in an asset manifest,
 * and scripts/fetch-assets.mjs downloads them at build time so they ship as
 * edge-served, same-origin, HTTP/2-multiplexed assets.
 *
 * Anything that fails to download falls back to its upstream URL, so a hiccup
 * degrades performance rather than breaking the build. */
const assetManifest = {}

function localAsset(localPath, remoteUrl) {
  if (!remoteUrl) return ''
  assetManifest[localPath] = remoteUrl
  return localPath
}

const championIcon = (id) => localAsset(`/img/champion/${id}.png`, `${DD}/champion/${id}.png`)

/* The full splash is ~1 MB per champion. The portrait ("loading") art is ~40 KB
 * and reads the same once cropped into the dialog banner. */
const championSplash = (id) =>
  `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${id}_0.jpg`

const itemIcon = (id) => localAsset(`/img/item/${id}.png`, `${DD}/item/${id}.png`)

/** "/lol-game-data/assets/ASSETS/UX/Cherry/Augments/Icons/Eureka_small.png"
 *  -> ".../assets/ux/cherry/augments/icons/eureka_small.png"
 *  Rendered at 26px, so the 64px "small" variant is plenty — the 256px "large"
 *  one was four times the bytes for no visible gain. */
function augmentIcon(id, size = 'small') {
  const path = cherry[String(id)]?.augmentSmallIconPath
  if (!path) return ''
  const rel = path
    .replace('/lol-game-data/assets/', '')
    .toLowerCase()
    .replace('_small.png', `_${size}.png`)
  return localAsset(`/img/augment/${id}.png`, `${CDRAGON}/${rel}`)
}

/* ------------------------------------------------------------------ helpers */

/** Riot ships item text as pseudo-HTML. Flatten it into readable lines. */
function itemTextToLines(html) {
  if (!html) return []
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(mainText|stats|passive|active|rules|flavorText)>/gi, '\n')
    .replace(/<(attention|scale\w*|magicDamage|physicalDamage|trueDamage|healing|shield|status|speed|ornnBonus|keywordMajor|keywordStealth|rarity\w*)>/gi, '')
    .replace(/<\/(attention|scale\w*|magicDamage|physicalDamage|trueDamage|healing|shield|status|speed|ornnBonus|keywordMajor|keywordStealth|rarity\w*)>/gi, '')
    .replace(/<li>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Split flattened item text into "25 Ability Power" stat lines and prose. */
const STAT_LINE = /^[+-]?\d[\d.,]*%?\s+[A-Za-z][A-Za-z '/-]*$/

function splitItemText(lines) {
  const stats = []
  const text = []
  for (const line of lines) {
    if (STAT_LINE.test(line) && text.length === 0) stats.push(line)
    else text.push(line)
  }
  return { stats, text }
}

const ROLE_LABELS = {
  Fighter: 'Fighter',
  Mage: 'Mage',
  Assassin: 'Assassin',
  Tank: 'Tank',
  Marksman: 'Marksman',
  Support: 'Support',
}

const RARITY = {
  kSilver: 'silver',
  kGold: 'gold',
  kPrismatic: 'prismatic',
}

/** Riot leaves inline icon tokens (%i:OnHit%) and unfilled ? placeholders in
 *  augment text. Strip the tokens and tidy the spacing they leave behind. */
function cleanAugmentText(s) {
  if (!s) return ''
  return s
    .replace(/%i:[^%]*%/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim()
}

const trTips = tr.tips || {}
const trAug = tr.augments || {}
const trBuildNames = tr.misc?.buildNames || {}
const trGroupNames = tr.misc?.groupNames || {}
const trNotes = new Map((tr.misc?.notes || []).map((n) => [`${n.hero}::${n.build}`, n.en]))

/* Anything the upstream site adds after the last translation pass arrives in
 * Chinese. Rather than dropping it, fall back to the original text and record
 * it, so a scheduled refresh can report exactly what needs translating. */
const CJK = /[一-鿿]/
const missing = { augments: [], tips: [], buildNames: [], groupNames: [], notes: [], guides: [] }

function noteMissing(bucket, value) {
  if (value && CJK.test(value) && !missing[bucket].includes(value)) missing[bucket].push(value)
}

function tip(s) {
  if (!s || !s.trim()) return ''
  const en = trTips[s]
  if (en) return en
  noteMissing('tips', s)
  return s
}

function translatedName(map, bucket, value) {
  if (!value) return value
  const en = map[value]
  if (en) return en
  noteMissing(bucket, value)
  return value
}

function mapItem(it) {
  const en = enItems[String(it.id)]
  const { stats, text } = splitItemText(itemTextToLines(en?.description))
  return {
    id: it.id,
    name: en?.name || it.name,
    icon: itemIcon(it.id),
    price: it.price,
    stats,
    text,
    tip: tip(it.tip),
  }
}

function mapAugment(a) {
  const t = trAug[String(a.id)]
  const official = cherry[String(a.id)]
  if (!t?.desc) noteMissing('augments', `${a.id} ${a.name}`)
  return {
    id: a.id,
    name: t?.name || official?.nameTRA || a.name,
    icon: augmentIcon(a.id),
    rarity: RARITY[a.rarity] || 'silver',
    // fall back to the source description so a new augment still says something
    desc: cleanAugmentText(t?.desc || a.description || ''),
    highlighted: !!a.highlighted,
    rank: a.recommendationRank ?? null,
    score: a.recommendationScore ?? null,
    tip: tip(a.tip),
  }
}

/* ------------------------------------------------------------------ heroes */

const champions = snapshot.bootstrap.data.champions.map((c) => {
  const en = enChampions[c.id]
  return {
    id: c.id,
    key: c.numericId,
    name: en?.name || c.title,
    title: en?.title || '',
    roles: (c.tags || []).map((t) => ROLE_LABELS[t] || t),
    icon: championIcon(c.id),
    splash: championSplash(c.id),
    rank: c.rank,
    winRate: c.winRate,
    updateTime: c.updateTime,
    guideCount: c.guideCount,
    // searchable aliases: English name, id, and lowercase forms
    aliases: [en?.name, c.id, en?.title].filter(Boolean),
  }
})

const heroDetails = {}
for (const [id, h] of Object.entries(snapshot.heroes)) {
  const cfg = h.config
  heroDetails[id] = {
    id,
    rank: cfg.rank,
    winRate: cfg.winRate,
    tier: cfg.tier,
    updateTime: cfg.updateTime,
    statsUpdateTime: cfg.statsUpdateTime,
    balance: (h.balanceAdjustments || []).map((b) => ({
      label: b.label || b.name || '',
      value: b.value ?? b.text ?? '',
    })),
    builds: cfg.buildGuides.map((b) => ({
      id: b.id,
      name: translatedName(trBuildNames, 'buildNames', b.name),
      primarySkill: b.primarySkill,
      secondarySkill: b.secondarySkill,
      coreGroupName: translatedName(trGroupNames, 'groupNames', b.coreItemGroupName),
      optionalGroupName: translatedName(trGroupNames, 'groupNames', b.optionalItemGroupName),
      coreItems: b.coreItems.map(mapItem),
      optionalItems: b.optionalItems.map(mapItem),
      silver: b.silverAugments.map(mapAugment),
      gold: b.goldAugments.map(mapAugment),
      prismatic: b.prismaticAugments.map(mapAugment),
      traps: b.trapAugments.map(mapAugment),
      notes: (() => {
        const en = trNotes.get(`${id}::${b.id}`)
        if (en) return en
        noteMissing('notes', b.notes)
        return b.notes || ''
      })(),
      updatedAt: b.updatedAt,
    })),
  }
}

/* ------------------------------------------------------------------ guides */

const rawGuides = [
  ...snapshot.guides.data.list,
  ...extra.guidesPage2.data.list,
]
const trGuides = new Map((tr.guides || []).map((g) => [g.id, g]))

/** Guide bodies embed icon URLs from the original CDN. Rewrite them to the
 *  official Riot / CommunityDragon assets so nothing is hotlinked. */
function rewriteGuideAssets(markdown) {
  if (!markdown) return ''
  return markdown
    .replace(/https?:\/\/[^\s)]*\/augments\/[^\s)]*?(\d+)\.png[^\s)]*/g, (m, id) =>
      augmentIcon(id) || m
    )
    .replace(/https?:\/\/[^\s)]*\/items\/(\d+)\.png[^\s)]*/g, (m, id) => itemIcon(id))
    .replace(/https?:\/\/[^\s)]*\/champions\/([A-Za-z']+)\.png[^\s)]*/g, (m, id) =>
      championIcon(id)
    )
}

const guides = rawGuides.map((g) => {
  const t = trGuides.get(g.id) || {}
  if (!t.title) noteMissing('guides', g.title)
  return {
    id: g.id,
    slug: g.id.replace('guide-', ''),
    title: t.title || g.title,
    summary: t.summary || g.summary,
    gameplay: rewriteGuideAssets(t.gameplay || g.gameplay),
    augmentIds: g.runeIds,
    optionalAugmentIds: g.optionalRuneIds,
    itemIds: g.itemIds,
    optionalItemIds: g.optionalItemIds,
    heroIds: g.heroIds,
    authorName: t.authorName ?? g.authorName,
    authorLocation: t.authorLocation ?? g.authorLocation,
    viewCount: g.viewCount,
    upvotes: g.upvotes,
    downvotes: g.downvotes,
    commentCount: g.commentCount,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }
})

/* ---------------------------------------------------------------- messages */

const trMsg = new Map((tr.messages || []).map((m) => [m.id, m]))

function mapMessage(m) {
  const t = trMsg.get(m.id) || {}
  return {
    id: m.id,
    author: t.displayName || m.displayName,
    location: t.location ?? m.location,
    isAdmin: m.isAdmin,
    content: t.content ?? m.content,
    images: m.images || [],
    likeCount: m.likeCount,
    createdAt: m.createdAt,
    replies: (m.replies || []).map(mapMessage),
    replyCount: m.replyCount,
  }
}
const messages = extra.messagesAll.map(mapMessage)

/* ------------------------------------------------------------ icon lookups */

const augmentIndex = {}
for (const h of Object.values(heroDetails)) {
  for (const b of h.builds) {
    for (const a of [...b.silver, ...b.gold, ...b.prismatic, ...b.traps]) {
      if (!augmentIndex[a.id]) {
        augmentIndex[a.id] = { id: a.id, name: a.name, icon: a.icon, rarity: a.rarity, desc: a.desc }
      }
    }
  }
}
const itemIndex = {}
for (const h of Object.values(heroDetails)) {
  for (const b of h.builds) {
    for (const it of [...b.coreItems, ...b.optionalItems]) {
      if (!itemIndex[it.id]) itemIndex[it.id] = { id: it.id, name: it.name, icon: it.icon }
    }
  }
}

/* ------------------------------------------------------------------- write */

const outDir = resolve(root, 'public/data')
rmSync(outDir, { recursive: true, force: true })
mkdirSync(resolve(outDir, 'heroes'), { recursive: true })

const write = (rel, data) =>
  writeFileSync(resolve(outDir, rel), JSON.stringify(data), 'utf8')

write('meta.json', {
  patch: snapshot.bootstrap.data.currentVersion,
  ddragon: snapshot.english.version,
  capturedAt: snapshot.capturedAt,
  championCount: champions.length,
  guideCount: guides.length,
  messageCount: messages.length,
})
write('asset-manifest.json', assetManifest)
write('champions.json', champions)
write('guides.json', guides)
write('messages.json', messages)
write('augments.json', augmentIndex)
write('items.json', itemIndex)
for (const [id, detail] of Object.entries(heroDetails)) {
  write(`heroes/${id}.json`, detail)
}

const missingTotal = Object.values(missing).reduce((n, v) => n + v.length, 0)
write('missing-translations.json', { total: missingTotal, ...missing })

if (missingTotal) {
  console.warn(
    `\n  ${missingTotal} untranslated string(s) fell back to the source language:\n` +
      Object.entries(missing)
        .filter(([, v]) => v.length)
        .map(([k, v]) => `    ${k}: ${v.length}`)
        .join('\n') +
      `\n  See public/data/missing-translations.json\n`
  )
}

console.log(
  `built: ${champions.length} champions, ${Object.keys(heroDetails).length} detail files, ` +
    `${guides.length} guides, ${messages.length} messages, ` +
    `${Object.keys(assetManifest).length} icons to localise, ` +
    `${Object.keys(augmentIndex).length} augments, ${Object.keys(itemIndex).length} items`
)
