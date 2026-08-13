<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { loadJson } from '../composables/useData'
import ItemChip from './ItemChip.vue'
import AugmentCard from './AugmentCard.vue'

const props = defineProps({
  champion: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const detail = ref(null)
const loading = ref(false)
const activeBuild = ref(0)

/* While the dialog is open, stop painting the page behind it (see theme.css)
 * so the browser is not compositing 173 champion images under the scrim.
 *
 * Simply setting `overflow: hidden` on the page loses the reader's place, so
 * this pins the body at a negative offset and restores the exact scroll
 * position on close. */
let savedScroll = 0

function setPageLocked(locked) {
  const html = document.documentElement
  const body = document.body
  if (locked) {
    if (html.classList.contains('dialog-open')) return
    savedScroll = window.scrollY
    body.style.position = 'fixed'
    body.style.top = `-${savedScroll}px`
    body.style.left = '0'
    body.style.right = '0'
    html.classList.add('dialog-open')
  } else {
    if (!html.classList.contains('dialog-open')) return
    html.classList.remove('dialog-open')
    body.style.position = ''
    body.style.top = ''
    body.style.left = ''
    body.style.right = ''
    /* While the body was pinned the document had no height, so a scroll
     * restore would clamp to zero. Force layout back first, then restore —
     * and once more next frame, because off-screen cards using
     * content-visibility only get their real height once laid out. */
    void body.offsetHeight
    window.scrollTo(0, savedScroll)
    requestAnimationFrame(() => window.scrollTo(0, savedScroll))
  }
}
watch(() => props.champion, (c) => setPageLocked(!!c))
onBeforeUnmount(() => setPageLocked(false))

watch(
  () => props.champion,
  async (c) => {
    detail.value = null
    activeBuild.value = 0
    if (!c) return
    loading.value = true
    try {
      detail.value = await loadJson(`heroes/${c.id}.json`)
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

const build = computed(() => detail.value?.builds?.[activeBuild.value] ?? null)

const augmentTiers = computed(() => {
  if (!build.value) return []
  return [
    { key: 'silver', label: 'Silver Augments', list: build.value.silver },
    { key: 'gold', label: 'Gold Augments', list: build.value.gold },
    { key: 'prismatic', label: 'Prismatic Augments', list: build.value.prismatic },
  ].filter((t) => t.list.length)
})

const splash = computed(() => props.champion?.splash ?? '')
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="champion" class="dialog-mask" @click.self="emit('close')">
        <div class="dialog" role="dialog" aria-modal="true">
          <header class="dialog__head" :style="{ backgroundImage: `url(${splash})` }">
            <div class="dialog__head-inner">
              <img class="dialog__avatar" :src="champion.icon" :alt="champion.name" />
              <div class="dialog__ident">
                <h2>{{ champion.name }}</h2>
                <span class="dialog__title">{{ champion.title }}</span>
              </div>
              <div class="dialog__stats">
                <span class="chip">Rank #{{ champion.rank }}</span>
                <span class="chip">Win rate {{ champion.winRate.toFixed(2) }}%</span>
                <span v-if="detail?.tier" class="chip chip--tier">{{ detail.tier }}</span>
              </div>
              <button class="dialog__close" type="button" aria-label="Close" @click="emit('close')">
                ×
              </button>
            </div>
          </header>

          <div class="dialog__body">
            <p v-if="loading" class="empty-state">Loading build…</p>

            <template v-else-if="build">
              <div v-if="detail.builds.length > 1" class="build-tabs">
                <button
                  v-for="(b, i) in detail.builds"
                  :key="b.id"
                  class="pill-btn"
                  :class="{ 'is-active': i === activeBuild }"
                  type="button"
                  @click="activeBuild = i"
                >
                  {{ b.name }}
                  <small v-if="b.primarySkill">
                    max {{ b.primarySkill }}{{ b.secondarySkill ? ' → ' + b.secondarySkill : '' }}
                  </small>
                </button>
              </div>

              <div class="dialog__grid">
                <section class="dialog__col">
                  <div class="block">
                    <h3 class="block__title">{{ build.coreGroupName }}</h3>
                    <div class="item-grid">
                      <ItemChip v-for="it in build.coreItems" :key="it.id" :item="it" />
                    </div>
                  </div>

                  <div v-if="build.optionalItems.length" class="block">
                    <h3 class="block__title">{{ build.optionalGroupName }}</h3>
                    <div class="item-grid">
                      <ItemChip v-for="it in build.optionalItems" :key="it.id" :item="it" />
                    </div>
                  </div>

                  <div v-if="build.traps.length" class="block block--warn">
                    <h3 class="block__title">Trap Augments</h3>
                    <AugmentCard
                      v-for="a in build.traps"
                      :key="a.id"
                      :augment="a"
                      :show-rank="false"
                    />
                  </div>

                  <div v-if="build.notes" class="block">
                    <h3 class="block__title">Notes</h3>
                    <p class="block__notes">{{ build.notes }}</p>
                  </div>
                </section>

                <section class="dialog__col">
                  <div v-for="tier in augmentTiers" :key="tier.key" class="block">
                    <h3 class="block__title" :class="`block__title--${tier.key}`">
                      {{ tier.label }}
                    </h3>
                    <div class="augment-grid">
                      <AugmentCard v-for="a in tier.list" :key="a.id" :augment="a" />
                    </div>
                  </div>
                </section>
              </div>

              <footer class="dialog__foot muted">
                Build updated {{ build.updatedAt || detail.updateTime }} · stats
                {{ detail.statsUpdateTime }}
              </footer>
            </template>

            <p v-else class="empty-state">No build data for this champion yet.</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 16px;
  /* No backdrop-filter here. This element covers the whole viewport, and the
     173-card grid sits behind it — blurring that live every frame is what makes
     opening a champion lock up on real hardware. A solid scrim costs nothing. */
  background: rgba(6, 10, 18, 0.82);
  overflow-y: auto;
}

.dialog {
  width: min(1080px, 100%);
  border: 0.8px solid var(--border);
  border-radius: 22px;
  background: var(--panel-solid);
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.dialog__head {
  position: relative;
  background-size: cover;
  background-position: center 22%;
}

.dialog__head-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: linear-gradient(
    100deg,
    rgba(12, 18, 30, 0.94) 30%,
    rgba(12, 18, 30, 0.72) 100%
  );
}

.dialog__avatar {
  width: 54px;
  height: 54px;
  border: 1.6px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  object-fit: cover;
}

.dialog__ident h2 {
  margin: 0;
  color: #fff;
  font-size: 20px;
  font-weight: 800;
}

.dialog__title {
  color: rgba(255, 255, 255, 0.66);
  font-size: 13px;
}

.dialog__stats {
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-wrap: wrap;
}

.dialog__stats .chip {
  background: rgba(255, 255, 255, 0.12);
  color: #eaf0fb;
}

.chip--tier {
  color: var(--gold) !important;
}

.dialog__close {
  width: 32px;
  height: 32px;
  margin-left: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 20px;
  line-height: 1;
}

.dialog__close:hover {
  background: rgba(255, 255, 255, 0.22);
}

.dialog__body {
  padding: 16px 20px 20px;
}

.build-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.build-tabs small {
  opacity: 0.7;
  font-size: 11px;
  font-weight: 600;
}

.dialog__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

.dialog__col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.block {
  padding: 12px 13px;
  border: 0.8px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--panel);
}

.block--warn {
  border-color: rgba(255, 95, 109, 0.5);
}

.block__title {
  margin: 0 0 10px;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 700;
}

.block__title--silver {
  color: var(--silver-tone);
}
.block__title--gold {
  color: var(--gold-tone);
}
.block__title--prismatic {
  color: var(--prismatic-tone);
}

.block__notes {
  margin: 0;
  color: var(--text-dim);
  font-size: 13.5px;
  white-space: pre-line;
}

.item-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.augment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 8px;
}

.dialog__foot {
  margin-top: 14px;
  font-size: 12px;
}

@media (max-width: 860px) {
  .dialog-mask {
    padding: 16px 8px;
  }
  .dialog__grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .dialog__stats {
    width: 100%;
    margin-left: 0;
  }
  .dialog__head-inner {
    flex-wrap: wrap;
  }
}
</style>
