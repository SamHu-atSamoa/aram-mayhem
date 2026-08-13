<script setup>
import SiteHeader from './components/SiteHeader.vue'
</script>

<template>
  <main class="app-main">
    <SiteHeader />

    <RouterView v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>
</template>
