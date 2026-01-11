Cloudflare Worker for MLP uploads

This Worker implements a secure upload endpoint for the Mara Language Preservation project.

Endpoints
- POST /api/upload
  - Accepts multipart/form-data with one or more `file` fields and optional metadata fields.
  - Validates file size and type (see `worker.js` for configured limits).
  - Stores files into a private R2 bucket via the binding `MLP_UPLOADS`.
  - Returns JSON { success: true, uploaded: [ { originalName, size, contentType, objectKey } ] }
  - Does NOT return public URLs.

Important configuration steps
1) Create an R2 bucket in the Cloudflare dashboard and keep it private.
2) Add the R2 bucket as a binding to your Worker and name the binding `MLP_UPLOADS`.
   - With Wrangler you can add an `r2_buckets` entry in `wrangler.toml`.
3) Deploy the Worker using Wrangler or the Cloudflare dashboard.

Notes on large files
- Workers have practical limits for buffering request bodies; this Worker accepts small-to-moderate files (example limit: 200 MB).
- For very large uploads (hundreds of MB to multiple GB), follow Cloudflare's recommended pattern:
  1) Client requests a signed upload URL from a Worker (or a Worker returns an upload token).
  2) Browser uploads directly to R2 using the signed URL (bypassing Worker for the large payload).
  3) The Worker verifies and records upload metadata.

Security
- Do not embed any R2 credentials in the frontend.
- All writes to R2 should go through the Worker (or be performed via signed URLs generated server-side).

Example Wrangler snippet (local development):

# wrangler.toml
# name = "mlp-uploads"
# main = "./cloudflare-worker/worker.js"
# compatibility_date = "2026-01-01"
# 
# [[r2_buckets]]
# binding = "MLP_UPLOADS"
# bucket_name = "<your-r2-bucket-name>"

Replace <your-r2-bucket-name> with your bucket name in Cloudflare.

Contact
If you'd like, I can add a sample `wrangler.toml` and a small example script that requests a signed URL for large files.
