/**
 * Champion search — matches on English name, internal id, and title, plus
 * initials (e.g. "mf" -> Miss Fortune) the way the original site matched pinyin
 * initials.
 */

function initials(name) {
  return name
    .split(/[\s'’.-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toLowerCase()
}

export function championHaystack(c) {
  const parts = new Set()
  const add = (s) => {
    if (s) parts.add(String(s).toLowerCase())
  }
  add(c.name)
  add(c.id)
  add(c.title)
  add(initials(c.name))
  add(c.name.replace(/[^a-z]/gi, ''))
  for (const a of c.aliases || []) add(a)
  return [...parts]
}

export function matchChampion(c, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (!c._hay) c._hay = championHaystack(c)
  return c._hay.some((h) => h.includes(q))
}

export const ROLES = ['All', 'Fighter', 'Mage', 'Assassin', 'Tank', 'Marksman', 'Support']
