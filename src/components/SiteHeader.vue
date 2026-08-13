<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { theme, toggleTheme } from '../composables/useTheme'
import { meta } from '../composables/useData'

const route = useRoute()

const tabs = [
  { name: 'champions', to: '/', label: 'Champions', short: 'Champs' },
  { name: 'guides', to: '/guides', label: 'Off-Meta Builds', short: 'Off-Meta' },
  { name: 'messages', to: '/messages', label: 'Message Board', short: 'Board' },
  { name: 'more', to: '/more', label: 'More', short: 'More' },
]

const activeIndex = computed(() => {
  const i = tabs.findIndex((t) => route.path === t.to || route.path.startsWith(t.to + '/'))
  return i === -1 ? 0 : i
})

const patch = computed(() => meta.value?.patch ?? '')
</script>

<template>
  <header class="shell-header">
    <div class="shell-brand">
      <span class="shell-site-link">ARAMMAYHEM</span>
      <div class="shell-title-row">
        <h1 class="shell-title">ARAM Mayhem</h1>
        <span v-if="patch" class="shell-version-badge">{{ patch }}</span>
      </div>
    </div>

    <nav class="shell-nav">
      <div class="shell-tabs" :style="{ '--active': activeIndex }">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.name"
          :to="tab.to"
          class="tab"
          :class="{ 'is-active': tabs[activeIndex].name === tab.name }"
        >
          <span class="tab-label--desktop">{{ tab.label }}</span>
          <span class="tab-label--mobile">{{ tab.short }}</span>
        </RouterLink>
        <span class="tab-underline" />
      </div>

      <button
        class="icon-btn"
        type="button"
        :title="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        :aria-label="theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
        @click="toggleTheme"
      >
        <svg v-if="theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.shell-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 17px;
  margin-bottom: 16px;
  border: 0.8px solid var(--border-soft);
  border-radius: 24px;
  background: var(--panel);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
  color: var(--text);
}

.shell-site-link {
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1.4px;
}

.shell-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shell-title {
  margin: 2px 0 0;
  color: var(--text-strong);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.shell-version-badge {
  padding: 2px 9px;
  border-radius: 999px;
  border: 0.8px solid rgba(119, 167, 255, 0.55);
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 700;
}

.shell-nav {
  display: flex;
  align-items: center;
  gap: 14px;
}

.shell-tabs {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab {
  position: relative;
  padding: 8px 16px;
  border-radius: 10px;
  color: var(--text-muted);
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.16s ease;
}

.tab:hover {
  color: var(--text-strong);
}

.tab.is-active {
  color: var(--accent-line);
}

.tab-underline {
  position: absolute;
  bottom: -6px;
  left: 0;
  height: 2px;
  width: calc(100% / 4);
  border-radius: 999px;
  background: var(--accent-line);
  transform: translateX(calc(var(--active) * 100%));
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-label--mobile {
  display: none;
}

@media (max-width: 860px) {
  .shell-header {
    padding: 13px;
    border-radius: 18px;
  }
  .shell-title {
    font-size: 21px;
  }
  .shell-nav {
    width: 100%;
    justify-content: space-between;
  }
  .tab {
    padding: 7px 10px;
    font-size: 14px;
  }
  .tab-label--desktop {
    display: none;
  }
  .tab-label--mobile {
    display: inline;
  }
}
</style>
