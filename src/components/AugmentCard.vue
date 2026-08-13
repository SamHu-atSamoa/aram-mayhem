<script setup>
import { ref } from 'vue'

defineProps({
  augment: { type: Object, required: true },
  showRank: { type: Boolean, default: true },
})

const open = ref(false)
</script>

<template>
  <div
    class="augment"
    :class="[`is-${augment.rarity}`, { 'is-highlighted': augment.highlighted, 'is-open': open }]"
    @mouseenter="open = true"
    @mouseleave="open = false"
    @click="open = !open"
  >
    <img
      class="augment__icon"
      :src="augment.icon"
      :alt="augment.name"
      width="64"
      height="64"
      loading="lazy"
    />

    <div class="augment__body">
      <span class="augment__name">{{ augment.name }}</span>
      <span v-if="augment.tip" class="augment__tip">{{ augment.tip }}</span>
    </div>

    <span v-if="showRank && augment.rank" class="augment__rank">#{{ augment.rank }}</span>

    <div v-if="open && augment.desc" class="augment__tooltip">
      <strong>{{ augment.name }}</strong>
      <p v-for="(line, i) in augment.desc.split('\n')" :key="i">{{ line }}</p>
    </div>
  </div>
</template>

<style scoped>
.augment {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 0.8px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--panel-raised);
  cursor: default;
  transition: border-color 0.16s ease, background 0.16s ease;
}

.augment:hover {
  border-color: var(--accent);
}

.augment.is-highlighted {
  border-color: var(--gold);
  background: rgba(247, 203, 85, 0.08);
}

.augment__icon {
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  object-fit: cover;
  background: rgba(0, 0, 0, 0.35);
}

.augment__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.augment__name {
  color: var(--text-strong);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.is-silver .augment__name {
  color: var(--silver-tone);
}
.is-gold .augment__name {
  color: var(--gold-tone);
}
.is-prismatic .augment__name {
  color: var(--prismatic-tone);
}

.augment__tip {
  color: var(--text-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.augment__rank {
  flex: none;
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 700;
}

.augment__tooltip {
  position: absolute;
  z-index: 40;
  top: calc(100% + 6px);
  left: 0;
  width: max(240px, 100%);
  max-width: 320px;
  padding: 10px 12px;
  border: 0.8px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--panel-solid);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
  color: var(--text-dim);
  font-size: 12.5px;
  line-height: 1.5;
  pointer-events: none;
}

.augment__tooltip strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-strong);
}

.augment__tooltip p {
  margin: 0 0 4px;
}
</style>
