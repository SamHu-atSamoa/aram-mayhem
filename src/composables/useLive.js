import { ref } from 'vue'

/**
 * Optional live overlay for the numbers that need no translation.
 *
 * Win rate and rank are language-free, so they can come straight from the
 * upstream API on every page load. Everything else — build names, notes,
 * guides — stays on the translated snapshot the scheduled rebuild produces.
 * That split is the whole trick: live numbers, English prose.
 *
 * Where it fetches from, via VITE_LIVE_API:
 *
 *   unset            same-origin `/api/...`, served by the Worker in
 *                    worker/index.js. No CORS, edge-cached.
 *   a full URL       that origin instead (e.g. a standalone Worker)
 *   "off"            disabled — the site makes no third-party requests at all
 *
 * Any failure (no function deployed, offline, upstream down) silently keeps
 * the built-in snapshot, which is at most a day old.
 */

const CONFIGURED = import.meta.env.VITE_LIVE_API ?? ''
const DISABLED = CONFIGURED.toLowerCase() === 'off'
const BASE = DISABLED ? '' : CONFIGURED.replace(/\/$/, '')

// 'off' | 'loading' | 'live' | 'unavailable'
export const liveStatus = ref(DISABLED ? 'off' : 'loading')

let pending = null

/** Fetch { [championId]: { winRate, rank } } from the API, or null. */
export function fetchLiveStats() {
  if (DISABLED) return Promise.resolve(null)
  if (pending) return pending

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  pending = fetch(`${BASE}/api/public/hextech-aram/heroes/bootstrap`, {
    signal: controller.signal,
  })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
    .then((json) => {
      const list = json?.data?.champions
      if (!Array.isArray(list)) throw new Error('unexpected payload')
      const byId = {}
      for (const c of list) {
        byId[c.id] = { winRate: c.winRate, rank: c.rank }
      }
      liveStatus.value = 'live'
      return byId
    })
    .catch(() => {
      // Worker not deployed, offline, or upstream down — snapshot stands.
      liveStatus.value = 'unavailable'
      return null
    })
    .finally(() => clearTimeout(timeout))

  return pending
}

/** Patch live win rate and rank onto a champion list, in place. */
export function applyLiveStats(champions, stats) {
  if (!stats) return champions
  for (const c of champions) {
    const live = stats[c.id]
    if (!live) continue
    if (typeof live.winRate === 'number') c.winRate = live.winRate
    if (typeof live.rank === 'number') c.rank = live.rank
  }
  return champions
}
