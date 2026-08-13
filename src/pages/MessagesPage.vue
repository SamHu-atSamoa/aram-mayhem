<script setup>
import { ref, computed } from 'vue'
import { useJson } from '../composables/useData'
import MessageItem from '../components/MessageItem.vue'

const { data: messages, loading, reload } = useJson('messages.json', [])

const sort = ref('newest')
const draft = ref('')

const total = computed(() => {
  const count = (list) =>
    list.reduce((n, m) => n + 1 + (m.replies?.length ? count(m.replies) : 0), 0)
  return count(messages.value || [])
})

const sorted = computed(() => {
  const list = [...(messages.value || [])]
  if (sort.value === 'newest') list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  else list.sort((a, b) => b.likeCount - a.likeCount || b.createdAt.localeCompare(a.createdAt))
  return list
})
</script>

<template>
  <div class="messages-page">
    <section class="panel">
      <h2 class="panel-title">Post a message</h2>
      <p class="muted hint">
        This rebuild is a static snapshot — posting is disabled, but the composer is here to
        match the original layout.
      </p>

      <textarea
        v-model="draft"
        class="composer"
        maxlength="500"
        placeholder="Write your message…"
      />

      <div class="composer-foot">
        <span class="muted">{{ draft.length }}/500</span>
        <button class="submit-btn" type="button" disabled title="Read-only snapshot">
          Submit
        </button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2 class="panel-title">Messages</h2>
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
            :class="{ 'is-active': sort === 'top' }"
            type="button"
            @click="sort = 'top'"
          >
            Top
          </button>
          <span class="chip">{{ total }} total</span>
          <button class="icon-btn" type="button" title="Reload" @click="reload">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
            </svg>
          </button>
        </div>
      </div>

      <p v-if="loading" class="empty-state">Loading messages…</p>

      <div v-else class="message-list">
        <MessageItem v-for="m in sorted" :key="m.id" :message="m" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.messages-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hint {
  margin: 4px 0 12px;
  font-size: 13px;
}

.composer {
  width: 100%;
  min-height: 96px;
  padding: 12px 14px;
  border: 0.8px solid var(--border);
  border-radius: 12px;
  background: var(--panel-raised);
  color: var(--text);
  font-size: 14px;
  resize: vertical;
  outline: none;
}

.composer:focus {
  border-color: var(--accent);
}

.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 12.5px;
}

.submit-btn {
  padding: 9px 22px;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 14px;
  font-weight: 600;
  opacity: 0.6;
  cursor: not-allowed;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}
</style>
