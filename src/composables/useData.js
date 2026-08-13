import { ref, shallowRef } from 'vue'

const BASE = import.meta.env.BASE_URL || '/'

const cache = new Map()

/** Fetch a JSON file from public/data once and memoise it. */
export function loadJson(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(`${BASE}data/${path}`).then((r) => {
        if (!r.ok) throw new Error(`${path}: ${r.status}`)
        return r.json()
      })
    )
  }
  return cache.get(path)
}

/** Reactive wrapper: returns { data, loading, error, reload }. */
export function useJson(path, initial = null) {
  const data = shallowRef(initial)
  const loading = ref(true)
  const error = ref(null)

  const run = (force = false) => {
    if (force) cache.delete(path)
    loading.value = true
    error.value = null
    return loadJson(path)
      .then((d) => {
        data.value = d
      })
      .catch((e) => {
        error.value = e
      })
      .finally(() => {
        loading.value = false
      })
  }

  run()
  return { data, loading, error, reload: () => run(true) }
}

export const meta = shallowRef(null)
loadJson('meta.json').then((m) => {
  meta.value = m
})
