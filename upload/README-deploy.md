Local testing and deployment

Local testing options

- Quick mock server (Node):
  1. Install dependencies: `npm install express multer cors`
  2. From `upload/` run: `node mock-server.js`
  3. Open the UI at `file://.../upload/index.html` or serve static files and point to the UI; the frontend will POST to `http://localhost:3000/api/upload` by default if you set `UPLOAD_ENDPOINT` in the UI.

- Wrangler Pages (recommended for full end-to-end):
  1. Install wrangler: `npm i -g wrangler`
  2. Configure `wrangler.toml` with your account and R2 binding `MLP_UPLOADS`.
  3. Run `wrangler pages dev .` from repository root to test Pages Functions and Worker routes locally.

Deploying the Worker to Cloudflare

1. Ensure `wrangler.toml` has:

```toml
name = "marareih-uploads"
main = "cloudflare-worker/worker.js"
compatibility_date = "2025-01-01"

[r2_buckets]
MLP_UPLOADS = "YOUR_R2_BUCKET_NAME"
```

2. Authenticate: `wrangler login` or set `CF_API_TOKEN` with appropriate R2 permissions.
3. Publish: `wrangler publish` (this deploys the worker which listens for `/api/upload`).

Security notes

- Do not embed R2 credentials in client-side code.
- For very large uploads (>100-200MB) implement signed URL uploads to R2 and have the Worker issue short-lived put URLs.
- Validate file types and sizes server-side in the Worker before writing to R2.
