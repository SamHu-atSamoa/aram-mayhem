/**
 * Cloudflare Pages Function — cached, same-origin proxy for the upstream ARAM
 * stats API.
 *
 * Because this deploys alongside the site, the browser calls `/api/...` on your
 * own domain and CORS never enters the picture.
 *
 * Requests are cached at the edge for 10 minutes, so however many friends are
 * looking at the site, the upstream host sees at most a handful of requests an
 * hour. Only the specific read-only endpoints below are proxied — this is not
 * an open relay.
 */

const UPSTREAM = 'https://test.cchappy.top'
const CACHE_SECONDS = 600

const ALLOWED = [
  /^api\/public\/hextech-aram\/heroes\/bootstrap$/,
  /^api\/public\/hextech-aram\/heroes\/[A-Za-z]+$/,
  /^api\/public\/hextech-aram\/guides\/bootstrap$/,
  /^api\/public\/message-board\/messages$/,
]

export async function onRequestGet(context) {
  const { request, params, waitUntil } = context

  const path = ['api', ...(Array.isArray(params.path) ? params.path : [params.path])]
    .filter(Boolean)
    .join('/')

  if (!ALLOWED.some((re) => re.test(path))) {
    return json({ error: 'not proxied', path }, 404)
  }

  const url = new URL(request.url)
  const cache = caches.default
  const cacheKey = new Request(url.toString(), { method: 'GET' })

  const hit = await cache.match(cacheKey)
  if (hit) return hit

  let upstream
  try {
    upstream = await fetch(`${UPSTREAM}/${path}${url.search}`, {
      headers: {
        accept: 'application/json',
        'user-agent': 'arammayhem-rebuild/1.0 (cached edge proxy)',
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

  waitUntil(cache.put(cacheKey, response.clone()))
  return response
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-max-age': '86400',
    },
  })
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
