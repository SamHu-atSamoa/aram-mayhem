<script setup>
/* Upstream 4.0.1: every augment's win rate, pick rate and game count on this
 * champion — a leaderboard alongside the hand-picked recommendations, so
 * players can check a pick against the numbers. Sorted by win rate by default
 * and filterable by rarity, like upstream's. */
import { ref, computed, watch } from 'vue'
import { loadJson } from '../composables/useData'

const props = defineProps({
  championId: { type: String, required: true },
})

const PREVIEW_ROWS = 15
const RARITIES = [
  { key: 'all', label: 'All' },
  { key: 'silver', label: 'Silver' },
  { key: 'gold', label: 'Gold' },
  { key: 'prismatic', label: 'Prismatic' },
]
const COLUMNS = [
  { key: 'winRate', label: 'Win rate' },
  { key: 'pickRate', label: 'Pick rate' },
  { key: 'games', label: 'Games' },
]

const stats = ref(null)
const index = ref({})
const failed = ref(false)
const rarity = ref('all')
const sortKey = ref('winRate')
const showAll = ref(false)

watch(
  () => props.championId,
  async (id) => {
    stats.value = null
    failed.value = false
    showAll.value = false
    try {
      // augments.json is shared and memoised, so only the first dialog pays for it
      const [s, idx] = await Promise.all([
        loadJson(`augment-stats/${id}.json`),
        loadJson('augments.json'),
      ])
      if (id !== props.championId) return
      index.value = idx
      stats.value = s
    } catch {
      failed.value = true
    }
  },
  { immediate: true }
)

const rows = computed(() => {
  if (!stats.value) return []
  const out = []
  for (const [tier, list] of Object.entries(stats.value.groups)) {
    if (rarity.value !== 'all' && tier !== rarity.value) continue
    for (const [id, winRate, pickRate, games] of list) {
      const a = index.value[id]
      if (a) out.push({ ...a, rarity: tier, winRate, pickRate, games })
    }
  }
  const key = sortKey.value
  /* Upstream sends a null win rate when the sample is too small to report.
   * Those rows go last whatever the sort, rather than reading as 0%. */
  return out.sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1))
})

const visible = computed(() => (showAll.value ? rows.value : rows.value.slice(0, PREVIEW_ROWS)))

const fmtPct = (v) => (v == null ? '—' : `${v.toFixed(2)}%`)
const fmtGames = (v) => (v ? v.toLocaleString('en-US') : '—')
</script>

<template>
  <div v-if="stats && !failed" class="block rankings">
    <div class="rankings__head">
      <h3 class="block__title">Augment Rankings</h3>
      <div class="rankings__filters" role="group" aria-label="Filter by rarity">
        <button
          v-for="r in RARITIES"
          :key="r.key"
          type="button"
          class="filter-btn"
          :class="[`filter-btn--${r.key}`, { 'is-active': rarity === r.key }]"
          @click="(rarity = r.key), (showAll = false)"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <table class="rankings__table">
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Augment</th>
          <th v-for="c in COLUMNS" :key="c.key" class="num">
            <button
              type="button"
              class="sort-btn"
              :class="{ 'is-active': sortKey === c.key }"
              :aria-pressed="sortKey === c.key"
              @click="sortKey = c.key"
            >
              {{ c.label }}<span aria-hidden="true">{{ sortKey === c.key ? ' ▾' : '' }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(a, i) in visible" :key="a.id" :title="a.desc">
          <td class="num muted">{{ i + 1 }}</td>
          <td>
            <span class="aug">
              <img :src="a.icon" :alt="''" width="64" height="64" loading="lazy" />
              <span :class="`aug__name aug__name--${a.rarity}`">{{ a.name }}</span>
            </span>
          </td>
          <td class="num" :class="{ good: a.winRate >= 52, bad: a.winRate != null && a.winRate < 48 }">
            {{ fmtPct(a.winRate) }}
          </td>
          <td class="num">{{ fmtPct(a.pickRate) }}</td>
          <td class="num muted">{{ fmtGames(a.games) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="rankings__foot">
      <button
        v-if="rows.length > PREVIEW_ROWS"
        type="button"
        class="pill-btn rankings__more"
        @click="showAll = !showAll"
      >
        {{ showAll ? 'Show fewer' : `Show all ${rows.length}` }}
      </button>
      <span class="muted">
        Patch {{ stats.dataVersion }} · synced {{ stats.syncedAt }} · "—" means too few games
      </span>
    </div>
  </div>
</template>

<style scoped>
.rankings {
  margin-top: 14px;
}

.rankings__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.rankings__head .block__title {
  margin: 0;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
}

.rankings__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-btn {
  padding: 4px 12px;
  border: 0.8px solid var(--border);
  border-radius: 999px;
  background: var(--panel-raised);
  color: var(--text-dim);
  font-size: 12.5px;
  font-weight: 600;
}

.filter-btn:hover {
  border-color: var(--accent);
}

.filter-btn.is-active {
  background: var(--accent-soft);
  border-color: transparent;
  color: var(--accent-strong);
}
.filter-btn--silver.is-active {
  color: var(--silver-tone);
}
.filter-btn--gold.is-active {
  color: var(--gold-tone);
}
.filter-btn--prismatic.is-active {
  color: var(--prismatic-tone);
}

.rankings__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.rankings__table th {
  padding: 6px 8px;
  border-bottom: 0.8px solid var(--border);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
}

.rankings__table td {
  padding: 5px 8px;
  border-bottom: 0.8px solid var(--border-soft);
  color: var(--text);
}

.rankings__table tbody tr:last-child td {
  border-bottom: 0;
}

.rankings__table .num {
  text-align: right;
  white-space: nowrap;
}

.sort-btn {
  padding: 0;
  background: none;
  color: inherit;
  font: inherit;
}

.sort-btn:hover,
.sort-btn.is-active {
  color: var(--accent-strong);
}

.aug {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* CommunityDragon's "small" icon is 64px; shown at 24 like the other lists. */
.aug img {
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.35);
}

.aug__name {
  font-weight: 600;
}
.aug__name--silver {
  color: var(--silver-tone);
}
.aug__name--gold {
  color: var(--gold-tone);
}
.aug__name--prismatic {
  color: var(--prismatic-tone);
}

.good {
  color: var(--green) !important;
  font-weight: 700;
}
.bad {
  color: var(--danger) !important;
}

.rankings__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  font-size: 12px;
}

.rankings__more {
  padding: 5px 14px;
  font-size: 12.5px;
}

@media (max-width: 560px) {
  .rankings__table th,
  .rankings__table td {
    padding: 5px 4px;
  }
  /* Games is the least useful column on a phone; drop it rather than scroll. */
  .rankings__table th:last-child,
  .rankings__table td:last-child {
    display: none;
  }
}
</style>
