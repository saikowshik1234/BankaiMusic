# Song ID proxy

A ~40-line Cloudflare Worker that keeps the AudD API token out of the app
entirely. Free tier: 100k requests/day, no card required.

## Deploy

```bash
cd server/identify-proxy
npx wrangler login
npx wrangler secret put AUDD_API_TOKEN      # from audd.io/dashboard
npx wrangler secret put PROXY_SHARED_KEY    # any random string you make up
npx wrangler deploy
```

`wrangler deploy` prints your Worker's URL (`https://turntable-identify-proxy.<your-subdomain>.workers.dev`).

## Wire it into the app

In the app's `.env` (see `.env.example` at the repo root):

```
EXPO_PUBLIC_IDENTIFY_PROXY_URL=https://turntable-identify-proxy.<your-subdomain>.workers.dev
EXPO_PUBLIC_IDENTIFY_PROXY_KEY=<the same random string you set as PROXY_SHARED_KEY>
```

Both of these are safe to compile into the client: the URL is just an
endpoint, and the shared key only gates casual abuse of your free AudD
quota — it isn't hiding anything expensive. The actual AudD token never
leaves this Worker.
