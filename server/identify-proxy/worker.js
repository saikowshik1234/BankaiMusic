/**
 * Song ID proxy — a Cloudflare Worker that sits between the app and AudD.
 *
 * The app has NO AudD token at all. It sends the recorded clip here with a
 * shared-secret header; this Worker attaches the real (server-only) AudD
 * token and forwards to https://api.audd.io. This is what actually keeps
 * the billed AudD token out of the compiled app — env vars alone only keep
 * secrets out of git, not out of a shipped binary.
 *
 * PROXY_SHARED_KEY is a lightweight gate, not real auth: it stops casual
 * scraping/randomly-discovered-URL abuse of your free AudD quota, but
 * anyone who decompiles the app can still read it out of the bundle same
 * as any client-embedded value. That's an acceptable trade-off here
 * because the worst case is burning through a FREE quota faster, not a
 * surprise bill — there is no way to fully hide a value that has to ship
 * inside a public client app.
 *
 * Deploy:
 *   npx wrangler login
 *   npx wrangler secret put AUDD_API_TOKEN
 *   npx wrangler secret put PROXY_SHARED_KEY
 *   npx wrangler deploy
 */
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const key = request.headers.get('x-turntable-key');
    if (!env.PROXY_SHARED_KEY || key !== env.PROXY_SHARED_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }

    let file;
    try {
      const incoming = await request.formData();
      file = incoming.get('file');
    } catch {
      file = null;
    }
    if (!file) {
      return new Response(JSON.stringify({ status: 'error', error: { error_message: 'No file provided.' } }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    try {
      const outgoing = new FormData();
      outgoing.append('api_token', env.AUDD_API_TOKEN);
      outgoing.append('return', 'spotify,apple_music');
      outgoing.append('file', file, 'clip.m4a');

      const auddResponse = await fetch('https://api.audd.io/', { method: 'POST', body: outgoing });
      const body = await auddResponse.text();

      return new Response(body, {
        status: auddResponse.status,
        headers: { 'content-type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({ status: 'error', error: { error_message: 'Song ID service is unreachable.' } }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      });
    }
  },
};
