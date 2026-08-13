<script setup>
import SiteHeader from './components/SiteHeader.vue'
import AnnouncementBar from './components/AnnouncementBar.vue'

const announcements = [
  'English rebuild of the ARAM Mayhem guide — data is a static snapshot.',
  'Hover any item or augment to read its full description.',
]
</script>

<template>
  <AnnouncementBar :messages="announcements" />

  <main class="app-main">
    <SiteHeader />

    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>
</template>
