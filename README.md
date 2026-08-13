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
| `npm run assets` | Downloads the 477 champion/item/augment icons into `public/img/` |
| `npm run build` | Runs both of the above, then bundles into `dist/` |
| `npm run capture` | Re-pulls the upstream snapshot into `data/raw/` (needs internet) |
| `npm run preview` | Serves the built `dist/` locally |

`dist/` is fully static. Drop it on any CDN, S3-compatible bucket, Netlify or nginx — no
rewrite rules needed, because routing lives in the URL hash. Deployment instructions for
Cloudflare are below.

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

Icons are **downloaded at build time and served from your own origin**, not hot-linked from
Riot's CDN. This is the single biggest thing affecting how fast the site feels: the champion
grid alone renders 173 icons at once, and fetching those cross-origin costs a DNS lookup, a
TLS handshake and 173 round trips to a CDN that may be nowhere near the visitor. Served as
Worker assets they come off Cloudflare's edge over one multiplexed connection, and
`public/_headers` marks them `immutable` for a year — champion and item art changes only when
Riot ships new art, so a repeat visit re-downloads nothing.

How it works:

1. `build-data.mjs` emits local paths (`/img/champion/Vayne.png`) and records where each one
   came from in `public/data/asset-manifest.json`.
2. `fetch-assets.mjs` downloads all 477 icons into `public/img/`, skipping any already
   present, so repeat builds are nearly free.
3. Vite copies `public/` into `dist/`, and they deploy as ordinary static assets.

Sources are Data Dragon for champion portraits and item icons, CommunityDragon for augment
icons. Augments use the 64px variant rather than 256px — they render at 26px, so the larger
file was four times the bytes for no visible gain.

If a download fails, that icon's dataset reference is rewritten back to its upstream URL, so
the site still shows it — just more slowly. The build never breaks over an icon.

The one image still fetched remotely is the champion portrait in the detail dialog, loaded
on demand when you open a champion. It uses Riot's `loading` art (~40 KB) rather than the
full splash (~1 MB); `index.html` preconnects to Data Dragon so that request starts warm.

### Refreshing the snapshot

Stats go stale as patches land. To refresh, re-capture the source data into
`data/raw/cchappy-data-full.json` keeping the same shape, update `translations.json` for any
new augments or guides, and re-run `npm run data`. The Data Dragon version is read from the
snapshot, so item and champion text follow automatically.

---

## Hosting on Cloudflare

The site deploys as a single Cloudflare Worker: the built SPA is served from static
assets, and `worker/index.js` handles `/api/*` as a cached proxy to the upstream stats API.
Cloudflare has folded Pages into Workers, so this is the current path for new accounts.

### 1. Push to GitHub

```bash
git remote add origin https://github.com/<you>/aram-mayhem.git
git push -u origin main
```

### 2. Create the Worker

Cloudflare dashboard → **Compute → Workers & Pages** → **Create application** → import from
Git, pick the repo, and set:

| Setting | Value |
| --- | --- |
| Project name | `aram-mayhem` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

Deploy. You get `aram-mayhem.<your-subdomain>.workers.dev` — send that to your friends. Every
push to `main` redeploys.

For your own domain, open the Worker → **Settings → Domains & Routes → Add custom domain**.

### How the routing works

`wrangler.toml` does the wiring:

```toml
main = "./worker/index.js"

[assets]
directory = "./dist/"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = [ "/api/*" ]
```

`run_worker_first` means only `/api/*` invokes the Worker script — every other request is
served straight from static assets with no script execution, so the site costs almost nothing
to run. Requests that do reach the Worker are checked against an allowlist of read-only
upstream endpoints; anything else gets a 404 rather than being relayed.

### 3. Live data

Two mechanisms work together, covering different things.

**Live win rates — on every page load.** The browser fetches
`/api/public/hextech-aram/heroes/bootstrap` on your own domain, so there is no cross-origin
request and nothing to configure. Win rate and rank are numbers, so they need no translation
and are overlaid onto the champion grid as soon as they arrive. The champion list shows a
green **live win rates** badge when this succeeds and a grey **snapshot** badge when it falls
back.

Responses are cached at Cloudflare's edge for 10 minutes, so no matter how many people are
browsing, the upstream site sees at most a handful of requests an hour. That matters — it is
someone else's API, and per-visitor traffic would be both rude and a good way to get blocked.

**Everything else — refreshed daily.** `.github/workflows/refresh-data.yml` runs
`scripts/capture.mjs` on a schedule (06:00 UTC, 19:00 Apia), re-pulls builds, augment
recommendations, guides and the message board, and commits the snapshot. That commit triggers
a Cloudflare rebuild on its own. Enable it under the repo's **Actions** tab; run it manually
any time from **Actions → Refresh data → Run workflow**.

This split exists for a reason: the numbers can be live because they are language-free, while
the prose has to pass through translation, which is a build-time step. When the upstream site
adds text that has no translation yet, the build falls back to the original Chinese and lists
it in `public/data/missing-translations.json`, summarised in the workflow run. Add the English
to `data/raw/translations.json` and it is picked up on the next build.

Worth knowing: upstream refreshes its stats in bulk roughly weekly — every champion in the
capture shared a single `statsUpdateTime`. So a daily rebuild is already ahead of the source,
and the live overlay mostly protects against being caught out right after a patch.

### Turning live data off

Set `VITE_LIVE_API=off` as a build variable on the Worker (**Settings → Variables**) and the
site makes no upstream requests at all — pure snapshot. Setting it to a full URL points the
overlay at some other origin instead.

### Local development

`npm run dev` runs Vite alone, with no Worker behind it, so the overlay reports **snapshot**.
To exercise the proxy and asset routing exactly as deployed:

```bash
npm run build
npx wrangler dev
```

---

## Known limits

- **Read-only.** There is no backend of your own. The message composer, voting and comment
  controls are deliberately inert — the composer is kept only so the layout matches the
  original.
- **Dependent on an upstream API.** Both the live overlay and the scheduled capture read a
  third party's endpoints. If they change paths, add authentication, or block the traffic, the
  live badge goes grey and the refresh workflow fails — the site keeps working on its last
  good snapshot. `scripts/capture.mjs` and `worker/index.js` are where you would adjust.
- **Translation lag.** New upstream prose appears in Chinese until it is translated; see
  `public/data/missing-translations.json`.
- **Guide count.** 20 guides and 170 message threads were captured; the original site may
  have more by now.

---

## Credits

Champion, item and augment names, icons and splash art are the property of Riot Games. This
project is not endorsed by or affiliated with Riot Games. Original site concept, build
recommendations and community-submitted content belong to their respective authors.
