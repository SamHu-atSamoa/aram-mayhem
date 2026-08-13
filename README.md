# ARAM Mayhem Guide

An English rebuild of a Chinese *ARAM: Mayhem* (海克斯大乱斗) strategy site — champion win
rates, recommended item builds and augment picks for all 173 champions, plus
community-submitted off-meta builds and a message board.

Built as a static Vue 3 single-page app with hash routing, mirroring the architecture of the
original: a plain bundle of files that runs from any static host or object store with no
server-side rewrites.

---

## Quick start

```bash
npm install
npm run dev      # regenerates data, then starts Vite on http://localhost:5173
```

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run data` | Rebuilds `public/data/` from the raw snapshot in `data/raw/` |
| `npm run build` | Runs `data`, then produces a production bundle in `dist/` |
| `npm run preview` | Serves the built `dist/` locally |

`dist/` is fully static. Drop it on any CDN, S3-compatible bucket, Netlify or nginx — no
rewrite rules needed, because routing lives in the URL hash. Deployment instructions for
Cloudflare Pages are below.

---

## How it is put together

```
scripts/build-data.mjs     transforms the raw snapshot into the app's English dataset
data/raw/                  the captured source data (see "Data" below)
public/data/               generated — one index per section, one file per champion
src/
  router/                  vue-router in hash mode
  pages/                   Champions, Off-Meta Builds, Guide detail, Message Board, More
  components/              header, champion card + dialog, item/augment cards, markdown
  composables/             JSON loading + memoisation, theme, champion search
  styles/theme.css         design tokens (dark and light) and shared primitives
```

**Data loading.** `public/data/champions.json` is fetched once for the grid. A champion's
full build — items, augments across all three rarities, trap augments, notes — lives in its
own `public/data/heroes/<Champion>.json` and is fetched lazily the first time you open that
champion, then memoised. This keeps the initial payload small even though the complete
dataset is several megabytes.

**Routing.** Hash mode (`/#/`, `/#/guides`, `/#/messages`) exactly as the original. Page
components are lazily imported, so each route ships as its own chunk.

**Theme.** Dark by default, matching the original; light is opt-in via the header toggle and
persisted to `localStorage`. All colour lives in CSS custom properties in
`src/styles/theme.css` — change the tokens there and both themes follow.

**Markdown.** Guide bodies are Markdown containing inline augment and item icons. They are
rendered by a small purpose-built parser in `src/components/MarkdownView.vue` that escapes
all input before formatting it, so no raw HTML from the dataset reaches the DOM.

---

## Data

The dataset is a **point-in-time snapshot**, not a live feed. Everything under `public/data/`
is generated from four files in `data/raw/`:

| File | Contents |
| --- | --- |
| `cchappy-data-full.json` | Champion list, per-champion builds and augment recommendations, guides, announcements, plus Riot Data Dragon champion and item data |
| `cchappy-extra.json` | Second page of guides and the full message board |
| `cherry_by_id.json` | Official English ARAM augment names, from CommunityDragon |
| `translations.json` | English translations of the original Chinese prose |

Run `npm run data` after changing any of them.

### Where the English comes from

- **Champion and item names and descriptions** — Riot Data Dragon (`en_US`), official.
- **Augment names** — CommunityDragon `cherry-augments.json`, official.
- **Augment descriptions, build names, notes, guides, message board** — translated from the
  original Chinese, using Riot's English terminology (Ability Haste, on-hit, Move Speed and
  so on) so it reads like the game does.

### Images

No images are hotlinked from the original site. Icons are rewritten at build time to Riot's
own CDNs:

- champion portraits and splash art, and item icons → Data Dragon
- ARAM augment icons → CommunityDragon

A small number of augments publish only a `_small` icon; `src/main.js` installs a global
image-error handler that retries those once at the smaller size.

### Refreshing the snapshot

Stats go stale as patches land. To refresh, re-capture the source data into
`data/raw/cchappy-data-full.json` keeping the same shape, update `translations.json` for any
new augments or guides, and re-run `npm run data`. The Data Dragon version is read from the
snapshot, so item and champion text follow automatically.

---

## Hosting on Cloudflare Pages

The site is designed around Cloudflare Pages: the static build and the `/api` proxy deploy
together as one project, and the free tier comfortably covers a site shared with friends.

### 1. Push to GitHub

```bash
git init && git add -A
git commit -m "ARAM Mayhem guide"
git branch -M main
git remote add origin https://github.com/<you>/arammayhem.git
git push -u origin main
```

### 2. Connect the repo in Cloudflare

In the Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to
Git**, pick the repo, and set:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |

Deploy. You get `https://arammayhem.pages.dev` — send that to your friends. Every push to
`main` redeploys automatically.

To use your own domain, open the project → **Custom domains** → **Set up a domain**. If the
domain's DNS is already on Cloudflare, the record is created for you; otherwise follow the
CNAME instructions shown.

### 3. Live data

Two mechanisms work together, and they cover different things.

**Live win rates — instant, on every page load.** `functions/api/[[path]].js` deploys with the
site as a Pages Function, so the browser fetches `/api/public/hextech-aram/heroes/bootstrap`
on *your own domain*: no CORS, no extra service, nothing to configure. Win rate and rank are
numbers, so they need no translation and are overlaid onto the champion grid as soon as they
arrive. The champion list shows a green **live win rates** badge when this succeeds and a
grey **snapshot** badge when it falls back.

Responses are cached at Cloudflare's edge for 10 minutes, so no matter how many people are
browsing, the upstream site sees at most a handful of requests an hour. That matters — it is
someone else's API, and hammering it per-visitor would be both rude and a good way to get
blocked.

**Everything else — refreshed daily.** `.github/workflows/refresh-data.yml` runs
`scripts/capture.mjs` on a schedule (06:00 UTC, 19:00 Apia), re-pulls builds, augment
recommendations, guides and the message board, and commits the snapshot. That commit triggers
a Cloudflare rebuild on its own. Enable it under the repo's **Actions** tab; run it manually
any time from **Actions → Refresh data → Run workflow**.

This split exists for a reason: the numbers can be live because they are language-free,
while the prose has to pass through translation, which is a build-time step. When the upstream
site adds text that has no translation yet, the build falls back to the original Chinese and
lists it in `public/data/missing-translations.json`, summarised in the workflow run. Add the
English to `data/raw/translations.json` and it picks it up on the next build.

Worth knowing: upstream refreshes its stats in bulk roughly weekly — every champion in the
capture shared a single `statsUpdateTime`. So a daily rebuild is already ahead of the source,
and the live overlay mostly protects against being caught out right after a patch.

### Turning live data off

Set `VITE_LIVE_API=off` as an environment variable in the Cloudflare project (**Settings →
Environment variables**) and the site makes no third-party requests at all — pure snapshot.
Setting it to a full URL points the overlay at some other origin instead, if you ever want to
run the proxy separately.

### Local development

`npm run dev` has no Pages Function behind it, so the overlay reports **snapshot**. To
exercise the proxy locally, build first and serve through Wrangler:

```bash
npm run build
npx wrangler pages dev dist
```

---

## Known limits

- **Read-only.** There is no backend of your own. The message composer, voting and comment
  controls are deliberately inert — the composer is kept only so the layout matches the
  original.
- **Dependent on an upstream API.** Both the live overlay and the scheduled capture read a
  third party's endpoints. If they change paths, add authentication, or block the traffic, the
  live badge goes grey and the refresh workflow fails — the site keeps working on its last
  good snapshot. `scripts/capture.mjs` and `functions/api/[[path]].js` are where you would
  adjust.
- **Translation lag.** New upstream prose appears in Chinese until it is translated; see
  `public/data/missing-translations.json`.
- **Guide count.** 20 guides and 170 message threads were captured; the original site may
  have more by now.

---

## Credits

Champion, item and augment names, icons and splash art are the property of Riot Games. This
project is not endorsed by or affiliated with Riot Games. Original site concept, build
recommendations and community-submitted content belong to their respective authors.
