# ARAM Mayhem — project context

Read this first. It is the handover from the session that built this project.

## What this is

An English rebuild of a Chinese *ARAM: Mayhem* (海克斯大乱斗) League of Legends strategy site
— champion win rates, item builds and augment recommendations for all 173 champions, plus
community-submitted off-meta builds and a message board.

Static Vue 3 SPA with hash routing, deployed as a single Cloudflare Worker.

| | |
| --- | --- |
| Live | https://aram-mayhem.samoa.workers.dev |
| Repo | https://github.com/SamHu-atSamoa/aram-mayhem |
| Local | `D:\arammayhem` |
| Cloudflare | Worker `aram-mayhem`, account subdomain `samoa.workers.dev` |
| Upstream data | `https://test.cchappy.top/api/public/...` (third party, not ours) |

## Commands

```bash
npm run dev        # data + assets, then Vite dev server
npm run build      # what Cloudflare runs
npm run data       # regenerate public/data/ from data/raw/
npm run assets     # download the 477 icons into public/img/
npm run capture    # re-pull upstream into data/raw/ (needs internet)
npx wrangler dev   # serve the built site *with* the Worker (needed to test /api)
```

`npm run dev` alone does not run the Worker, so the live-stats overlay always reports
"snapshot" locally. Use `npx wrangler dev` to exercise `/api`.

## Layout

```
worker/index.js        Worker entry: serves assets, proxies /api/* to upstream (cached 10m)
wrangler.toml          assets binding, run_worker_first for /api/*, not_found_handling
scripts/capture.mjs    re-pulls upstream API -> data/raw/
scripts/build-data.mjs data/raw/ + translations -> public/data/ (+ asset manifest)
scripts/fetch-assets.mjs downloads icons -> public/img/
data/raw/              committed snapshot (4 files) — the only real input
public/data/           generated, gitignored
public/img/            generated, gitignored
src/                   Vue app: pages/, components/, composables/, styles/theme.css
.github/workflows/refresh-data.yml   daily 06:00 UTC capture + commit
```

## How the data works

The site is a **snapshot**, refreshed daily, with one live overlay on top.

1. `refresh-data.yml` runs daily, calls `capture.mjs`, commits `data/raw/`.
2. That commit triggers a Cloudflare build, which runs `build-data` → `fetch-assets` → `vite build`.
3. At runtime, `useLive.js` fetches current win rates from `/api` and overlays them.

**Why the split:** win rate and rank are numbers, so they can be live. Everything else —
build names, notes, guides, board messages — is Chinese upstream and has to pass through
translation, which is a build step. English champion/item names come from Riot Data Dragon
and augment names from CommunityDragon, so those are official, not translated.

**When upstream adds new text**, the build falls back to the original Chinese and lists it in
`public/data/missing-translations.json`, summarised in the workflow run. Add English to
`data/raw/translations.json` and rebuild. Currently **0 missing**.

## Gotchas — all of these cost real time, do not rediscover them

- **Never `triggerRef` inside the watcher that owns the ref.** The live overlay mutates
  champion objects in place and calls `triggerRef`, which re-wakes its own watcher; because
  `fetchLiveStats` memoises its promise, that loops forever in microtasks and hard-freezes
  the tab. `ChampionsPage.vue` guards with `overlayDone`. This only reproduces when the live
  fetch *succeeds*, so it passes locally and breaks in production.
- **`not_found_handling` must stay `"none"`.** With `"single-page-application"` every
  unmatched path returns `index.html` with a 200, including stale hashed asset URLs — so a
  browser with a cached `index.html` gets HTML where it expects JS and the app never boots.
  The app uses hash routing, so the SPA fallback buys nothing.
- **Do not put `backdrop-filter` on anything full-viewport.** The dialog mask used to blur the
  whole viewport over 173 champion images and locked up real hardware. Solid scrim instead;
  the page behind is `visibility: hidden` while the dialog is open.
- **`content-visibility: hidden` collapses page height** and loses scroll position. The dialog
  pins the body with a negative offset and restores scroll on close instead.
- **Icons are self-hosted deliberately.** 173 cross-origin image requests on first paint was
  the single slowest thing about the site. `fetch-assets.mjs` downloads them at build time;
  `_headers` marks `/img/*` immutable. Do not revert to hot-linking Riot's CDN.
- **A hidden browser tab does not composite or fire `requestAnimationFrame`.** Any
  performance measurement taken in a background tab is meaningless — check
  `document.visibilityState` first.
- **Be gentle with the upstream API.** It is someone else's site. The Worker caches responses
  at the edge for 10 minutes and only proxies an allowlist of read-only endpoints; the capture
  script limits concurrency and pauses between requests. Keep both.

## Open items

- **Custom domain not attached.** Worker → Settings → Domains & Routes → Add custom domain.
  Once it works, add `workers_dev = false` to `wrangler.toml` to retire the workers.dev URL.
- **Repo is public and commits carry `sam.hu@niandagroup.com`.** If that should not be public,
  rewrite history or switch to `296743026+SamHu-atSamoa@users.noreply.github.com`.
- **`D:\arammayhem\_to_delete\`** holds transfer scratch from the build session — safe to
  delete entirely, and it is gitignored.
- Message board, voting and comments are intentionally inert; there is no backend of ours.

## Conventions

- Comments explain *why*, not *what*. Several rules above exist because a subtle bug cost
  hours — say so in the comment so nobody reverts it.
- Commit messages: short imperative subject, then the reasoning. See the existing log.
- `data/raw/` is the only committed data; everything under `public/data/` and `public/img/`
  is generated and gitignored.
- Verify changes before claiming they work. The freeze bug survived two rounds of confident
  fixes because the test harness was measuring the wrong thing.
