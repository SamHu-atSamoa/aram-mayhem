/**
 * Cloudflare Worker entry point.
 *
 * Serves the built SPA from the ASSETS binding and handles `/api/*` itself as a
 * cached, same-origin proxy to the upstream ARAM stats API. Because the proxy
 * lives on your own domain, the browser never makes a cross-origin request and
 * CORS does not come into it.
 *
 * Routing is configured in wrangler.toml: `run_worker_first = ["/api/*"]` means
 * only API paths reach this script — every other request is served straight
 * from static assets, with `not_found_handling = "single-page-application"`
 * falling back to index.html.
 *
 * Responses are cached at the edge for 10 minutes, so however many people are
 * using the site, the upstream host sees a handful of requests an hour rather
 * than one per visitor.
 */

const UPSTREAM = 'https://test.cchappy.top'
const CACHE_SECONDS = 600

/** Only these read-only endpoints are proxied — this is not an open relay. */
const ALLOWED = [
  /^\/api\/public\/hextech-aram\/heroes\/bootstrap$/,
  /^\/api\/public\/hextech-aram\/heroes\/[A-Za-z]+$/,
  /^\/api\/public\/hextech-aram\/guides\/bootstrap$/,
  /^\/api\/public\/message-board\/messages$/,
]

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-max-age': '86400',
        },
      })
    }

    if (request.method !== 'GET') {
      return json({ error: 'method not allowed' }, 405)
    }

    if (!ALLOWED.some((re) => re.test(url.pathname))) {
      return json({ error: 'not proxied', path: url.pathname }, 404)
    }

    const cache = caches.default
    const cacheKey = new Request(url.toString(), { method: 'GET' })

    const hit = await cache.match(cacheKey)
    if (hit) return hit

    let upstream
    try {
      upstream = await fetch(`${UPSTREAM}${url.pathname}${url.search}`, {
        headers: {
          accept: 'application/json',
          'user-agent': 'aram-mayhem/1.0 (cached edge proxy)',
        },
        cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
      })
    } catch (err) {
      return json({ error: 'upstream unreachable', detail: String(err) }, 502)
    }

    if (!upstream.ok) {
      return json({ error: 'upstream error', status: upstream.status }, 502)
    }

    const response = new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${CACHE_SECONDS}`,
        'access-control-allow-origin': '*',
      },
    })

    ctx.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  },
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  })
}
