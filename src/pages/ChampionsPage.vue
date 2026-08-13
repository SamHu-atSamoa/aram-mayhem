<script setup>
import { ref, computed, watch, triggerRef } from 'vue'
import { useJson } from '../composables/useData'
import { matchChampion, ROLES } from '../composables/useSearch'
import { fetchLiveStats, applyLiveStats, liveStatus } from '../composables/useLive'
import ChampionCard from '../components/ChampionCard.vue'
import ChampionDialog from '../components/ChampionDialog.vue'

const { data: champions, loading, reload } = useJson('champions.json', [])

/* Overlay live win rates once the snapshot has rendered, if configured. */
watch(
  champions,
  (list) => {
    if (!list?.length) return
    fetchLiveStats().then((stats) => {
      if (!stats) return
      applyLiveStats(list, stats)
      triggerRef(champions)
    })
  },
  { immediate: true }
)

const role = ref('All')
const query = ref('')
const sort = ref('winRate')
const large = ref(false)
const selected = ref(null)

const SORTS = [
  { key: 'winRate', label: 'Win rate' },
  { key: 'name', label: 'Name' },
  { key: 'updated', label: 'Recently updated' },
]

const filtered = computed(() => {
  const list = (champions.value || []).filter(
    (c) => (role.value === 'All' || c.roles.includes(role.value)) && matchChampion(c, query.value)
  )
  const sorted = [...list]
  if (sort.value === 'winRate') sorted.sort((a, b) => b.winRate - a.winRate)
  else if (sort.value === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
  else sorted.sort((a, b) => String(b.updateTime).localeCompare(String(a.updateTime)))
  return sorted
})

function cycleSort() {
  const i = SORTS.findIndex((s) => s.key === sort.value)
  sort.value = SORTS[(i + 1) % SORTS.length].key
}

const sortLabel = computed(() => SORTS.find((s) => s.key === sort.value)?.label ?? '')
</script>

<template>
  <div class="champions-page">
    <section class="panel filter-panel">
      <div class="panel-header">
        <h2 class="panel-title">Champions</h2>
        <div class="toolbar-actions">
          <button class="sort-btn" type="button" @click="cycleSort">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" />
            </svg>
            {{ sortLabel }}
          </button>
          <label class="view-toggle">
            <input v-model="large" type="checkbox" />
            <span>Large icons</span>
          </label>
          <button class="icon-btn" type="button" title="Reload" @click="reload">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
            </svg>
          </button>
          <span class="chip">{{ filtered.length }} champions</span>
        </div>
      </div>

      <div class="role-tabs">
        <button
          v-for="r in ROLES"
          :key="r"
          class="pill-btn"
          :class="{ 'is-active': role === r }"
          type="button"
          @click="role = r"
        >
          {{ r }}
        </button>
      </div>

      <input
        v-model="query"
        class="search-input"
        type="search"
        placeholder="Search by champion name, title or initials — e.g. Vayne, vn, mf"
      />

      <div class="panel-footer muted">
        Showing <strong>{{ role === 'All' ? 'all champions' : role }}</strong> ·
        sorted by {{ sortLabel.toLowerCase() }}
        <span v-if="liveStatus === 'live'" class="live-badge is-live">● live win rates</span>
        <span v-else-if="liveStatus === 'unavailable'" class="live-badge">snapshot</span>
      </div>
    </section>

    <p v-if="loading" class="empty-state">Loading champions…</p>

    <div v-else-if="filtered.length" class="champions-grid" :class="{ 'is-large': large }">
      <ChampionCard
        v-for="c in filtered"
        :key="c.id"
        :champion="c"
        :compact="!large"
        @click="selected = c"
      />
    </div>

    <p v-else class="empty-state">No champion matches “{{ query }}”.</p>

    <ChampionDialog :champion="selected" @close="selected = null" />
  </div>
</template>

<style scoped>
.champions-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 15px;
  border-radius: 999px;
  border: 0.8px solid var(--green);
  background: var(--green);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.sort-btn:hover {
  filter: brightness(1.08);
}

.view-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
}

.role-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-input {
  width: 100%;
  padding: 11px 14px;
  border: 0.8px solid var(--border);
  border-radius: 12px;
  background: var(--panel-raised);
  color: var(--text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.16s ease;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:focus {
  border-color: var(--accent);
}

.panel-footer {
  font-size: 13px;
}

.panel-footer strong {
  color: var(--text-dim);
}

.live-badge {
  margin-left: 10px;
  padding: 1px 9px;
  border-radius: 999px;
  background: var(--panel-raised);
  font-size: 11.5px;
  font-weight: 700;
}

.live-badge.is-live {
  background: rgba(15, 169, 127, 0.14);
  color: var(--green);
}

.champions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8.8px;
}

.champions-grid.is-large {
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
}

@media (max-width: 720px) {
  .champions-grid {
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 7px;
  }
  .champions-grid.is-large {
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  }
}
</style>
