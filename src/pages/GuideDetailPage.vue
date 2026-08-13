<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useJson } from '../composables/useData'
import MarkdownView from '../components/MarkdownView.vue'

const route = useRoute()
const { data: guides, loading } = useJson('guides.json', [])
const { data: augments } = useJson('augments.json', {})
const { data: items } = useJson('items.json', {})
const { data: champions } = useJson('champions.json', [])

const guide = computed(() => (guides.value || []).find((g) => g.id === route.params.id) || null)

const heroes = computed(() => {
  if (!guide.value) return []
  return guide.value.heroIds
    .map((id) => (champions.value || []).find((c) => c.id === id))
    .filter(Boolean)
})

const coreAugments = computed(() =>
  (guide.value?.augmentIds || []).map((id) => augments.value?.[id]).filter(Boolean)
)
const optionalAugments = computed(() =>
  (guide.value?.optionalAugmentIds || []).map((id) => augments.value?.[id]).filter(Boolean)
)
const coreItems = computed(() =>
  (guide.value?.itemIds || []).map((id) => items.value?.[id]).filter(Boolean)
)
const optionalItems = computed(() =>
  (guide.value?.optionalItemIds || []).map((id) => items.value?.[id]).filter(Boolean)
)
</script>

<template>
  <div class="guide-detail">
    <RouterLink to="/guides" class="back-link">← All off-meta builds</RouterLink>

    <p v-if="loading" class="empty-state">Loading…</p>

    <template v-else-if="guide">
      <article class="panel">
        <header class="guide-head">
          <h1>{{ guide.title }}</h1>
          <div class="guide-meta muted">
            <span>{{ guide.createdAt.slice(0, 10) }}</span>
            <span v-if="guide.authorName">
              by {{ guide.authorName }}<template v-if="guide.authorLocation">, {{ guide.authorLocation }}</template>
            </span>
            <span>👁 {{ guide.viewCount }}</span>
            <span>👍 {{ guide.upvotes }}</span>
          </div>

          <div v-if="heroes.length" class="guide-heroes">
            <span v-for="h in heroes" :key="h.id" class="hero-tag">
              <img :src="h.icon" :alt="h.name" loading="lazy" />
              {{ h.name }}
            </span>
          </div>

          <p class="guide-summary">{{ guide.summary }}</p>
        </header>

        <div class="loadout">
          <div v-if="coreAugments.length" class="loadout__block">
            <h2>Core augments</h2>
            <div class="token-row">
              <span v-for="a in coreAugments" :key="a.id" class="token" :class="`token--${a.rarity}`">
                <img :src="a.icon" :alt="a.name" loading="lazy" />
                {{ a.name }}
              </span>
            </div>
          </div>

          <div v-if="optionalAugments.length" class="loadout__block">
            <h2>Situational augments</h2>
            <div class="token-row">
              <span v-for="a in optionalAugments" :key="a.id" class="token" :class="`token--${a.rarity}`">
                <img :src="a.icon" :alt="a.name" loading="lazy" />
                {{ a.name }}
              </span>
            </div>
          </div>

          <div v-if="coreItems.length" class="loadout__block">
            <h2>Core items</h2>
            <div class="token-row">
              <span v-for="it in coreItems" :key="it.id" class="token token--item">
                <img :src="it.icon" :alt="it.name" loading="lazy" />
                {{ it.name }}
              </span>
            </div>
          </div>

          <div v-if="optionalItems.length" class="loadout__block">
            <h2>Situational items</h2>
            <div class="token-row">
              <span v-for="it in optionalItems" :key="it.id" class="token token--item">
                <img :src="it.icon" :alt="it.name" loading="lazy" />
                {{ it.name }}
              </span>
            </div>
          </div>
        </div>

        <MarkdownView :source="guide.gameplay" class="guide-body" />
      </article>
    </template>

    <p v-else class="empty-state">That build could not be found.</p>
  </div>
</template>

<style scoped>
.guide-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.back-link {
  align-self: flex-start;
  color: var(--text-muted);
  font-size: 13.5px;
  font-weight: 600;
}

.back-link:hover {
  color: var(--accent-strong);
}

.guide-head h1 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: 24px;
  font-weight: 800;
  line-height: 1.3;
}

.guide-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12.5px;
}

.guide-heroes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 12px 4px 5px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 600;
}

.hero-tag img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.guide-summary {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-left: 3px solid var(--accent);
  border-radius: 0 10px 10px 0;
  background: var(--accent-soft);
  color: var(--text-dim);
  font-size: 14px;
  line-height: 1.65;
}

.loadout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin: 18px 0;
  padding: 14px;
  border: 0.8px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--panel-raised);
}

.loadout__block h2 {
  margin: 0 0 8px;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.token-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.token {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px 3px 4px;
  border: 0.8px solid var(--border);
  border-radius: 999px;
  background: var(--panel-solid);
  color: var(--text-strong);
  font-size: 12.5px;
  font-weight: 600;
}

.token img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}

.token--gold {
  border-color: rgba(240, 192, 96, 0.55);
}
.token--prismatic {
  border-color: rgba(199, 155, 255, 0.55);
}
.token--item {
  border-color: rgba(119, 167, 255, 0.5);
}

.guide-body {
  margin-top: 6px;
}
</style>
