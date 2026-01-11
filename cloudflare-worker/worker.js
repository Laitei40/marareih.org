export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      })
    }

    const url = new URL(request.url);
    const pathname = url.pathname || '/';

    // POST /api/upload/init => return a signed PUT URL for direct-to-R2 uploads
    if (pathname === '/api/upload/init') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        })
      }

      try {
        // Parse JSON body
        const body = await request.json().catch(() => null);
        if (!body) return new Response(JSON.stringify({ success: false, error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });

        const { filename, size, type } = body;
        if (!filename || typeof filename !== 'string') return new Response(JSON.stringify({ success: false, error: 'Missing filename' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
        if (!size || typeof size !== 'number' || size <= 0) return new Response(JSON.stringify({ success: false, error: 'Invalid size' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });

        // Configurable max (default 5 GiB)
        const MAX_BYTES = Number(env.MAX_UPLOAD_BYTES) || (5 * 1024 * 1024 * 1024);
        if (size > MAX_BYTES) return new Response(JSON.stringify({ success: false, error: 'File too large' }), { status: 413, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });

        // Ensure required env values for signing are present
        const ACCOUNT_ID = env.R2_ACCOUNT_ID;
        const BUCKET = env.R2_BUCKET_NAME; // set this as secret/var in wrangler
        const ACCESS_KEY = env.R2_ACCESS_KEY_ID;
        const SECRET_KEY = env.R2_SECRET_ACCESS_KEY;

        if (!ACCOUNT_ID || !BUCKET || !ACCESS_KEY || !SECRET_KEY) {
          return new Response(JSON.stringify({ success: false, error: 'R2 signing keys not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
        }

        // Determine prefix (folder) based on filename extension, MIME type, or optional client-provided category.
        // Allowed prefixes: audio/, docs/, images/, photos/, others/, videos/
        const categoryOverride = (body.category && String(body.category)) || null;
        const prefix = choosePrefix({ filename, type, categoryOverride });

        // Generate a safe object key using the chosen prefix
        const uuid = generateUUID();
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
        const objectKey = `${prefix}${Date.now()}-${uuid}-${safeName}`;

        // Generate a presigned PUT URL (AWS v4 style) for the R2 object
        const expires = Math.min(60 * 60, Number(env.SIGNED_URL_EXPIRES) || 900); // default 15 minutes, cap 1 hour
        const endpoint = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
        const method = 'PUT';
        const protocol = 'https://';
        const host = endpoint;
        const path = `/${BUCKET}/${encodeURIComponent(objectKey)}`;

        const uploadUrl = await generatePresignedUrlV4({
          accessKeyId: ACCESS_KEY,
          secretAccessKey: SECRET_KEY,
          region: 'auto',
          service: 's3',
          host,
          method,
          path,
          expires,
          payloadHash: 'UNSIGNED-PAYLOAD'
        });

        return new Response(JSON.stringify({ success: true, uploadUrl: uploadUrl, objectKey }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: String(err && err.message ? err.message : err) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders() });
  }
}

// CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}

// Helper: generate a v4 presigned URL for R2 (S3-compatible). This implementation
// follows AWS Signature Version 4 for presigning a PUT request. Keys are expected
// to be provided to the Worker via environment variables (set securely in wrangler).
async function generatePresignedUrlV4({ accessKeyId, secretAccessKey, region, service, host, method, path, expires, payloadHash }) {
  // Dates
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  // Query params for presign
  const params = new URLSearchParams();
  params.set('X-Amz-Algorithm', algorithm);
  params.set('X-Amz-Credential', `${accessKeyId}/${credentialScope}`);
  params.set('X-Amz-Date', amzDate);
  params.set('X-Amz-Expires', String(expires));
  params.set('X-Amz-SignedHeaders', 'host');
  params.set('X-Amz-Content-Sha256', payloadHash || 'UNSIGNED-PAYLOAD');

  // Canonical request
  const canonicalQuerystring = params.toString();
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const canonicalRequest = [
    method,
    path,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash || 'UNSIGNED-PAYLOAD'
  ].join('\n');

  const canonicalRequestHash = await sha256Hex(canonicalRequest);

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');

  // Compute signing key
  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacBinary(kDate, region);
  const kService = await hmacBinary(kRegion, service);
  const kSigning = await hmacBinary(kService, 'aws4_request');
  const signature = await hmacHex(kSigning, stringToSign);

  params.set('X-Amz-Signature', signature);

  return `https://${host}${path}?${params.toString()}`;
}

// Utilities: HMAC and SHA256 helpers using Web Crypto
function toAmzDate(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}
+
+// Choose an R2 prefix based on filename or mimetype, or accept a safe category override
+function choosePrefix({ filename, type, categoryOverride }) {
+  const normalized = (s) => (s || '').toLowerCase();
+  const ext = normalized(filename).split('.').pop();
+  const t = normalized(type || '');
+
+  const allowed = new Set(['audio', 'docs', 'images', 'photos', 'other', 'others', 'videos']);
+  if (categoryOverride && allowed.has(categoryOverride.replace(/\/$/, ''))) {
+    const c = categoryOverride.replace(/\/$/, '');
+    // normalize 'other' -> 'others'
+    if (c === 'other') return 'others/';
+    return `${c}/`;
+  }
+
+  // Audio
+  if (t.startsWith('audio') || ['mp3','wav','ogg','m4a','flac'].includes(ext)) return 'audio/';
+  // Video
+  if (t.startsWith('video') || ['mp4','mov','mkv','webm','avi'].includes(ext)) return 'videos/';
+  // Documents (pdf, office, text)
+  if (['pdf','doc','docx','txt','csv','json','md','rtf'].includes(ext) || t.startsWith('text') || t === 'application/pdf' || t.includes('officedocument')) return 'docs/';
+  // Photos: common photographic image types
+  if (['jpg','jpeg','png','webp','heic','heif'].includes(ext)) return 'photos/';
+  // Images: svg, gif, bmp, tiff
+  if (t.startsWith('image') || ['svg','gif','bmp','tif','tiff'].includes(ext)) return 'images/';
+  // Archives and others
+  if (['zip','gz','tar','7z'].includes(ext)) return 'others/';
+
+  // Default
+  return 'others/';
+}
*** End Patch
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
  return new Uint8Array(sig);
}

async function hmacBinary(keyBytes, msg) {
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(msg));
  return new Uint8Array(sig);
}

async function hmacHex(keyBytes, msg) {
  const sig = await hmacBinary(keyBytes, msg);
  return bufferToHex(sig.buffer);
}

function bufferToHex(buf) {
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function generateUUID() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Per RFC4122 v4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}
