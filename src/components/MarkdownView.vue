<script setup>
import { computed } from 'vue'

/**
 * Small purpose-built Markdown renderer for guide bodies.
 * Supports the subset the source guides actually use: headings, ordered and
 * unordered lists, bold/italic/code, blockquotes, horizontal rules, tables,
 * links and inline images (augment/item icons).
 *
 * Everything is escaped first, so no raw HTML from the data reaches the DOM.
 */
const props = defineProps({
  source: { type: String, default: '' },
})

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(text) {
  let out = escape(text)
  // images first — alt text carries "augment:Name" / "item:Name"
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) => {
    const label = alt.replace(/^(augment|item):\s*/i, '')
    const kind = /^augment:/i.test(alt) ? 'augment' : 'item'
    return `<span class="md-token md-token--${kind}"><img src="${url}" alt="${label}" loading="lazy" /><span>${label}</span></span>`
  })
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return out
}

const html = computed(() => {
  const lines = (props.source || '').split('\n')
  const out = []
  let list = null // 'ul' | 'ol'
  let inTable = false

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`)
      list = null
    }
  }
  const closeTable = () => {
    if (inTable) {
      out.push('</tbody></table>')
      inTable = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      closeList()
      closeTable()
      continue
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      closeList()
      closeTable()
      const level = Math.min(heading[1].length + 1, 6)
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeList()
      closeTable()
      out.push('<hr />')
      continue
    }

    if (trimmed.startsWith('>')) {
      closeList()
      closeTable()
      out.push(`<blockquote>${inline(trimmed.replace(/^>\s?/, ''))}</blockquote>`)
      continue
    }

    // table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.slice(1, -1).split('|').map((c) => c.trim())
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue // separator row
      closeList()
      if (!inTable) {
        out.push('<table><thead><tr>')
        out.push(cells.map((c) => `<th>${inline(c)}</th>`).join(''))
        out.push('</tr></thead><tbody>')
        inTable = true
      } else {
        out.push(`<tr>${cells.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
      }
      continue
    }
    closeTable()

    const ol = trimmed.match(/^(\d+)\.\s+(.*)$/)
    if (ol) {
      if (list !== 'ol') {
        closeList()
        out.push('<ol>')
        list = 'ol'
      }
      out.push(`<li>${inline(ol[2])}</li>`)
      continue
    }

    const ul = trimmed.match(/^[-*+]\s+(.*)$/)
    if (ul) {
      if (list !== 'ul') {
        closeList()
        out.push('<ul>')
        list = 'ul'
      }
      out.push(`<li>${inline(ul[1])}</li>`)
      continue
    }

    closeList()
    out.push(`<p>${inline(trimmed)}</p>`)
  }

  closeList()
  closeTable()
  return out.join('\n')
})
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- source is escaped in `inline()` -->
  <div class="markdown" v-html="html" />
</template>

<style>
.markdown {
  color: var(--text-dim);
  font-size: 14.5px;
  line-height: 1.7;
}

.markdown h2,
.markdown h3,
.markdown h4,
.markdown h5,
.markdown h6 {
  margin: 22px 0 8px;
  color: var(--text-strong);
  font-weight: 700;
  line-height: 1.35;
}

.markdown h2 {
  font-size: 18px;
}
.markdown h3 {
  font-size: 16px;
}
.markdown h4,
.markdown h5,
.markdown h6 {
  font-size: 14.5px;
}

.markdown > *:first-child {
  margin-top: 0;
}

.markdown p {
  margin: 0 0 10px;
}

.markdown ul,
.markdown ol {
  margin: 0 0 12px;
  padding-left: 22px;
}

.markdown li {
  margin-bottom: 5px;
}

.markdown blockquote {
  margin: 0 0 12px;
  padding: 8px 14px;
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  background: var(--accent-soft);
}

.markdown hr {
  margin: 18px 0;
  border: none;
  border-top: 1px solid var(--border);
}

.markdown code {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 0.9em;
}

.markdown a {
  color: var(--accent-strong);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.markdown table {
  width: 100%;
  margin: 0 0 14px;
  border-collapse: collapse;
  font-size: 13.5px;
}

.markdown th,
.markdown td {
  padding: 7px 10px;
  border: 1px solid var(--border);
  text-align: left;
}

.markdown th {
  background: var(--accent-soft);
  color: var(--text-strong);
}

.md-token {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 2px 4px 2px 0;
  padding: 3px 9px 3px 4px;
  border: 0.8px solid var(--border);
  border-radius: 999px;
  background: var(--panel-raised);
  color: var(--text-strong);
  font-size: 12.5px;
  font-weight: 600;
  vertical-align: middle;
}

.md-token img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}

.md-token--augment {
  border-color: rgba(199, 155, 255, 0.5);
}

.md-token--item {
  border-color: rgba(119, 167, 255, 0.5);
}
</style>
