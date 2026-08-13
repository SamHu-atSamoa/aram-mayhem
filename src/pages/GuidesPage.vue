<script setup>
import { ref, computed } from 'vue'
import { useJson } from '../composables/useData'

const { data: guides, loading, reload } = useJson('guides.json', [])

const query = ref('')
const sort = ref('newest')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = (guides.value || []).filter((g) => {
    if (!q) return true
    return (
      g.title.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.heroIds.some((h) => h.toLowerCase().includes(q))
    )
  })
  const sorted = [...list]
  if (sort.value === 'newest') sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  else sorted.sort((a, b) => b.viewCount - a.viewCount)
  return sorted
})
</script>

<template>
  <div class="guides-page">
    <section class="panel">
      <div class="panel-header">
        <h2 class="panel-title">
          Off-Meta Builds
          <span class="muted count">{{ guides?.length ?? 0 }} builds</span>
        </h2>
        <div class="actions">
          <button
            class="pill-btn"
            :class="{ 'is-active': sort === 'newest' }"
            type="button"
            @click="sort = 'newest'"
          >
            Newest
          </button>
          <button
            class="pill-btn"
            :class="{ 'is-active': sort === 'popular' }"
            type="button"
            @click="sort = 'popular'"
          >
            Popular
          </button>
          <button class="icon-btn" type="button" title="Reload" @click="reload">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
            </svg>
          </button>
        </div>
      </div>

      <input
        v-model="query"
        class="search-input"
        type="search"
        placeholder="Search by title, summary or champion"
      />
    </section>

    <p v-if="loading" class="empty-state">Loading builds…</p>

    <div v-else-if="filtered.length" class="guide-grid">
      <RouterLink
        v-for="g in filtered"
        :key="g.id"
        class="guide-card"
        :to="`/guides/${g.id}`"
      >
        <div class="guide-card__head">
          <h3>{{ g.title }}</h3>
          <span class="guide-card__date muted">{{ g.createdAt.slice(0, 10) }}</span>
        </div>

        <p v-if="g.authorName" class="guide-card__author muted">
          Submitted by {{ g.authorName }}<template v-if="g.authorLocation">, {{ g.authorLocation }}</template>
        </p>

        <p class="guide-card__summary">{{ g.summary }}</p>

        <div class="guide-card__foot">
          <span class="stat">👍 {{ g.upvotes }}</span>
          <span class="stat">👎 {{ g.downvotes }}</span>
          <span class="stat">💬 {{ g.commentCount }}</span>
          <span class="stat">👁 {{ g.viewCount }}</span>
          <span class="guide-card__more">Read →</span>
        </div>
      </RouterLink>
    </div>

    <p v-else class="empty-state">No builds match “{{ query }}”.</p>
  </div>
</template>

<style scoped>
.guides-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.count {
  margin-left: 8px;
  font-size: 13px;
  font-weight: 500;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  width: 100%;
  margin-top: 12px;
  padding: 11px 14px;
  border: 0.8px solid var(--border);
  border-radius: 12px;
  background: var(--panel-raised);
  color: var(--text);
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: var(--accent);
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}

.guide-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border: 0.8px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--panel);
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.guide-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: var(--shadow);
}

.guide-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.guide-card__head h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 700;
}

.guide-card__date {
  flex: none;
  font-size: 12px;
}

.guide-card__author {
  margin: 0;
  font-size: 12.5px;
}

.guide-card__summary {
  margin: 0;
  color: var(--text-dim);
  font-size: 13.5px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.guide-card__foot {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  padding-top: 4px;
  color: var(--text-muted);
  font-size: 12.5px;
}

.guide-card__more {
  margin-left: auto;
  color: var(--accent-strong);
  font-weight: 600;
}

@media (max-width: 720px) {
  .guide-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
