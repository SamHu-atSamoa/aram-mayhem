import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/theme.css'

/**
 * A few augment icons ship only in the `_small` size on CommunityDragon
 * (DropBear, for one). Retry those once at the smaller size instead of
 * rendering a broken image. Capture phase, because `error` does not bubble.
 */
document.addEventListener(
  'error',
  (event) => {
    const el = event.target
    if (el?.tagName !== 'IMG' || el.dataset.retried) return
    if (!el.src.includes('_large.png')) return
    el.dataset.retried = '1'
    el.src = el.src.replace('_large.png', '_small.png')
  },
  true
)

createApp(App).use(router).mount('#app')
