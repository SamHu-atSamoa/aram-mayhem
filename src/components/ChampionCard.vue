<script setup>
import { ref } from 'vue'

defineProps({
  champion: { type: Object, required: true },
  compact: { type: Boolean, default: false },
})

const loaded = ref(false)
</script>

<template>
  <button class="champion-card" :class="{ 'is-large': !compact }" type="button">
    <div class="champion-avatar-wrap">
      <span class="champion-rank-badge">{{ champion.rank }}</span>
      <img
        class="champion-avatar"
        :class="{ 'is-loaded': loaded }"
        :src="champion.icon"
        :alt="champion.name"
        loading="lazy"
        decoding="async"
        @load="loaded = true"
      />
    </div>

    <div class="champion-info">
      <span class="champion-name">{{ champion.name }}</span>
      <span v-if="!compact" class="champion-role">{{ champion.roles.join(' · ') }}</span>
      <span class="champion-stat-chip">{{ champion.winRate.toFixed(2) }}%</span>
    </div>
  </button>
</template>

<style scoped>
.champion-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5.6px;
  padding: 7.2px 4px;
  border: 0.8px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--panel-solid);
  color: var(--text-dim);
  text-align: center;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.champion-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.24);
}

.champion-avatar-wrap {
  position: relative;
  width: 100%;
}

.champion-rank-badge {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  padding: 0 5px;
  border-radius: 7px 7px 7px 3px;
  background: rgba(9, 14, 24, 0.78);
  color: var(--gold);
  font-size: 10.5px;
  font-weight: 800;
  font-style: italic;
}

.champion-avatar {
  width: 100%;
  aspect-ratio: 1;
  border: 1.6px solid var(--panel-raised);
  border-radius: 12px;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.24s ease;
}

.champion-avatar.is-loaded {
  opacity: 1;
}

.champion-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
}

.champion-name {
  max-width: 100%;
  color: var(--text-strong);
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.champion-role {
  color: var(--text-muted);
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.champion-stat-chip {
  padding: 1.6px 6.7px;
  border-radius: 999px;
  background: rgba(95, 150, 242, 0.12);
  color: var(--accent);
  font-size: 10.25px;
  font-weight: 700;
}

.is-large .champion-name {
  font-size: 13px;
}
.is-large .champion-stat-chip {
  font-size: 11.5px;
}
</style>
