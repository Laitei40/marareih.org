Local testing and deployment (Worker-focused)

Local testing options

- Quick mock server (Node):
  1. Install dependencies: `npm install express multer cors`
  2. From the `upload/` folder run: `node mock-server.js`
  3. Open the UI (serve it with a simple static server or open `upload/index.html` in a browser). To test uploads against the mock server, set your browser to use `http://localhost:3000` as the API endpoint (the UI posts to `/api/upload` by default when served from the same origin).

- Wrangler Worker (recommended for full end-to-end):
  1. Install wrangler: `npm i -g wrangler`
  2. Configure `wrangler.toml` with your Cloudflare account and an R2 binding named `MLP_UPLOADS`.
  3. Run `wrangler dev` from repository root to test the Worker locally, or `wrangler publish` to deploy.

Deploying the Worker to Cloudflare

1. Ensure `wrangler.toml` has the Worker entry and an R2 binding. Example:

```toml
name = "mlp-uploads"
main = "cloudflare-worker/worker.js"
compatibility_date = "2026-01-01"

[[r2_buckets]]
binding = "MLP_UPLOADS"  # This is the binding name used in the Worker code
bucket_name = "YOUR_R2_BUCKET_NAME"
```

2. Authenticate: `wrangler login` or set `CF_API_TOKEN` with R2 write permissions.
3. Publish: `wrangler publish` (deploys the Worker). Use `wrangler dev` for local testing; note `wrangler dev` simulates the Worker environment and will use your R2 bindings when configured.

Important notes

- This project is configured for a standalone Cloudflare Worker. The Pages Functions handler was removed to avoid conflicting `/api/upload` routes. Use the Worker and R2 binding `MLP_UPLOADS`.
- Do not embed R2 credentials in client-side code.
- For very large uploads (>100-200MB) implement a signed-upload flow: have the Worker issue short-lived put URLs so browsers can upload directly to R2.
- Validate file types and sizes server-side in the Worker before writing to R2.
