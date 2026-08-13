<script setup>
import { meta } from '../composables/useData'
</script>

<template>
  <div class="more-page">
    <section class="panel">
      <h2 class="panel-title">About this build</h2>
      <p>
        An English rebuild of a Chinese <strong>ARAM: Mayhem</strong> strategy site — champion
        win rates, recommended item builds and augment picks for all
        {{ meta?.championCount ?? 173 }} champions, plus community-submitted off-meta builds
        and a message board.
      </p>

      <dl class="facts">
        <div>
          <dt>Game patch</dt>
          <dd>{{ meta?.patch ?? '—' }}</dd>
        </div>
        <div>
          <dt>Riot Data Dragon</dt>
          <dd>{{ meta?.ddragon ?? '—' }}</dd>
        </div>
        <div>
          <dt>Data captured</dt>
          <dd>{{ meta?.capturedAt ?? '—' }}</dd>
        </div>
        <div>
          <dt>Champions</dt>
          <dd>{{ meta?.championCount ?? '—' }}</dd>
        </div>
        <div>
          <dt>Off-meta builds</dt>
          <dd>{{ meta?.guideCount ?? '—' }}</dd>
        </div>
        <div>
          <dt>Board messages</dt>
          <dd>{{ meta?.messageCount ?? '—' }}</dd>
        </div>
      </dl>
    </section>

    <section class="panel">
      <h2 class="panel-title">How it works</h2>
      <ul class="notes">
        <li>
          <strong>Static single-page app.</strong> Vue 3 + Vue Router in hash mode, built with
          Vite. The whole site is plain files — it runs from any static host or object store
          with no server-side rewrites.
        </li>
        <li>
          <strong>Data is a snapshot.</strong> Champion stats, builds and augment
          recommendations were captured once and are committed as JSON under
          <code>public/data/</code>. Re-run <code>npm run data</code> to regenerate them from a
          fresh capture.
        </li>
        <li>
          <strong>English names are official.</strong> Champion and item names come from Riot's
          Data Dragon; augment names come from CommunityDragon. The prose — build names, notes,
          guides and board messages — was translated from the original Chinese.
        </li>
        <li>
          <strong>Read-only.</strong> Posting, voting and comments are intentionally inert:
          there is no backend behind this rebuild.
        </li>
      </ul>
    </section>

    <section class="panel">
      <h2 class="panel-title">Credits</h2>
      <p class="muted">
        Champion, item and augment names, icons and splash art are the property of Riot Games.
        This project is not endorsed by or affiliated with Riot Games. Original site concept,
        build recommendations and community content belong to their respective authors.
      </p>
    </section>
  </div>
</template>

<style scoped>
.more-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.more-page p {
  margin: 0;
  color: var(--text-dim);
  font-size: 14.5px;
  line-height: 1.7;
}

.panel-title {
  margin-bottom: 10px;
}

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin: 16px 0 0;
}

.facts > div {
  padding: 11px 13px;
  border: 0.8px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--panel-raised);
}

.facts dt {
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.facts dd {
  margin: 3px 0 0;
  color: var(--text-strong);
  font-size: 16px;
  font-weight: 700;
}

.notes {
  margin: 0;
  padding-left: 20px;
  color: var(--text-dim);
  font-size: 14px;
  line-height: 1.7;
}

.notes li {
  margin-bottom: 9px;
}

.notes strong {
  color: var(--text-strong);
}

code {
  padding: 1px 5px;
  border-radius: 5px;
  background: var(--accent-soft);
  color: var(--accent-strong);
  font-size: 0.9em;
}
</style>
