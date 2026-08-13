import { ref, watchEffect } from 'vue'

const KEY = 'arammayhem-theme'

function initial() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* storage unavailable — fall through to the default */
  }
  // The site is designed dark-first, like the original; light is opt-in.
  return 'dark'
}

export const theme = ref(initial())

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  try {
    localStorage.setItem(KEY, theme.value)
  } catch {
    /* ignore */
  }
})

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
