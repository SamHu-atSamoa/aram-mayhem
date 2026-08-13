<script setup>
import { ref } from 'vue'

defineProps({
  item: { type: Object, required: true },
})

const open = ref(false)
</script>

<template>
  <div
    class="item-chip"
    @mouseenter="open = true"
    @mouseleave="open = false"
    @click="open = !open"
  >
    <img class="item-chip__icon" :src="item.icon" :alt="item.name" loading="lazy" />
    <span class="item-chip__name">{{ item.name }}</span>

    <div v-if="open" class="item-chip__tooltip">
      <div class="item-chip__tooltip-head">
        <strong>{{ item.name }}</strong>
        <span v-if="item.price" class="item-chip__price">{{ item.price }}g</span>
      </div>
      <ul v-if="item.stats.length" class="item-chip__stats">
        <li v-for="(s, i) in item.stats" :key="i">{{ s }}</li>
      </ul>
      <p v-for="(line, i) in item.text" :key="`t${i}`">{{ line }}</p>
      <p v-if="item.tip" class="item-chip__tip">Tip: {{ item.tip }}</p>
    </div>
  </div>
</template>

<style scoped>
.item-chip {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border: 0.8px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--panel-raised);
  transition: border-color 0.16s ease, transform 0.16s ease;
}

.item-chip:hover {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.item-chip__icon {
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  background: rgba(0, 0, 0, 0.35);
}

.item-chip__name {
  flex: 1;
  min-width: 0;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-chip__tooltip {
  position: absolute;
  z-index: 40;
  top: calc(100% + 6px);
  left: 0;
  width: max(260px, 100%);
  max-width: 340px;
  padding: 11px 13px;
  border: 0.8px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--panel-solid);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.4);
  color: var(--text-dim);
  font-size: 12.5px;
  line-height: 1.5;
  pointer-events: none;
}

.item-chip__tooltip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}

.item-chip__tooltip-head strong {
  color: var(--text-strong);
}

.item-chip__price {
  color: var(--gold);
  font-size: 11.5px;
  font-weight: 700;
}

.item-chip__stats {
  margin: 0 0 6px;
  padding-left: 16px;
  color: var(--accent-strong);
}

.item-chip__tooltip p {
  margin: 0 0 5px;
}

.item-chip__tip {
  color: var(--gold);
}
</style>
