/**
 * Unified Proxy Worker
 * Routes requests to backend apps via Cloudflare Tunnel
 *
 * Path routing:
 *   /copa/*       → CopaMundial (Next.js + Socket.IO)
 *   /nocturne/*   → Nocturne backend (FastAPI)
 *   /bing/*       → bing backend (Hono)
 *   /api/*        → bing backend (Hono)
 *   /*            → bing 9Router dashboard
 *
 * Setup:
 * 1. Create Workers KV namespace: `tunnel-urls`
 * 2. Bind it to this Worker as `TUNNEL_KV`
 * 3. Run sync-tunnel-url.js to populate tunnel_url key
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Get tunnel URL from KV
    let tunnelUrl = await env.TUNNEL_KV.get('tunnel_url');
    if (!tunnelUrl) {
      return new Response('Tunnel URL not configured. Run sync-tunnel-url.js', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Ensure tunnel URL has trailing slash for proper path joining
    if (!tunnelUrl.endsWith('/')) tunnelUrl += '/';

    // Route mapping: path prefix → target path
    const routes = [
      { prefix: '/copa', target: '' },
      { prefix: '/nocturne', target: '/nocturne' },
      { prefix: '/nocturne-n8n', target: '/nocturne-n8n' },
      { prefix: '/novnc', target: '/novnc' },
      { prefix: '/api', target: '/api' },
      { prefix: '/health', target: '/health' },
    ];

    let targetPath = url.pathname;
    let matchedRoute = null;

    for (const route of routes) {
      if (url.pathname.startsWith(route.prefix)) {
        matchedRoute = route;
        // Strip the prefix and prepend the target
        targetPath = route.target + url.pathname.slice(route.prefix.length);
        break;
      }
    }

    // If no route matched, forward to root (9Router dashboard)
    if (!matchedRoute) {
      targetPath = url.pathname;
    }

    // Construct the target URL
    const targetUrl = new URL(targetPath + url.search, tunnelUrl);

    // Forward the request
    const headers = new Headers(request.headers);
    headers.set('Host', new URL(tunnelUrl).host);

    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
      redirect: 'manual',
    });

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        const redirectUrl = new URL(location, tunnelUrl);
        // Rewrite redirect to go through the worker
        redirectUrl.hostname = url.hostname;
        redirectUrl.port = url.port;
        redirectUrl.protocol = url.protocol;
        return new Response(null, {
          status: response.status,
          headers: { Location: redirectUrl.toString() },
        });
      }
    }

    // Copy response headers
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('Content-Encoding'); // Let Cloudflare handle it
    responseHeaders.delete('Content-Length');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  },
};
