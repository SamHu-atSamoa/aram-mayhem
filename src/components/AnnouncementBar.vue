<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  messages: { type: Array, default: () => [] },
})

const dismissed = ref(false)
const index = ref(0)
let timer = null

const current = computed(() => props.messages[index.value] ?? '')

onMounted(() => {
  if (props.messages.length > 1) {
    timer = setInterval(() => {
      index.value = (index.value + 1) % props.messages.length
    }, 6000)
  }
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div v-if="!dismissed && messages.length" class="site-announcement">
    <span class="site-announcement__dot" />
    <div class="site-announcement__viewport">
      <Transition name="roll" mode="out-in">
        <span :key="index" class="site-announcement__text">{{ current }}</span>
      </Transition>
    </div>
    <button
      class="site-announcement__close"
      type="button"
      aria-label="Dismiss announcement"
      @click="dismissed = true"
    >
      ×
    </button>
  </div>
</template>

<style scoped>
.site-announcement {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 1180px;
  margin: 12px auto 0;
  padding: 8px 12px;
  border: 0.8px solid var(--border-soft);
  border-radius: 999px;
  background: var(--panel);
  color: var(--text-strong);
  font-size: 14px;
  backdrop-filter: blur(12px);
}

.site-announcement__dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--danger);
  box-shadow: 0 0 0 4px rgba(255, 95, 109, 0.16);
}

.site-announcement__viewport {
  flex: 1;
  min-width: 0;
  height: 21px;
  overflow: hidden;
}

.site-announcement__text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site-announcement__close {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 0.8px solid var(--border-soft);
  background: var(--panel-raised);
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1;
}

.site-announcement__close:hover {
  color: var(--text-strong);
}

.roll-enter-active,
.roll-leave-active {
  transition: transform 0.4s ease, opacity 0.4s ease;
}
.roll-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.roll-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

@media (max-width: 720px) {
  .site-announcement {
    margin: 8px 10px 0;
    font-size: 13px;
  }
}
</style>
