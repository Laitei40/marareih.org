export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      })
    }
    // Route: only allow specific paths. We support /api/upload for R2 uploads
    const url = new URL(request.url);
    const pathname = url.pathname || '/';

    if (pathname === '/api/upload') {
      // Only accept POST for upload
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ success: false, error: 'Method Not Allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        })
      }

      try {
        // Important: Workers have request body size limits when using the classic runtime.
        // For large files (hundreds of MBs to GBs) we recommend implementing a signed-upload
        // flow where the Worker returns a short-lived URL that the browser PUTs to directly.
        // This endpoint handles small-to-moderate uploads directly via formData and R2.put.

        const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB per file (adjust as needed)
        const ALLOWED_TYPES = [
          'application/pdf', 'text/plain', 'text/csv', 'application/zip',
          'application/x-zip-compressed', 'audio/mpeg', 'audio/wav', 'audio/ogg',
          'application/json', 'image/png', 'image/jpeg'
        ];

        const formData = await request.formData();
        const uploaded = [];

        // Ensure an R2 binding is configured. Binding name: MLP_UPLOADS
        if (!env.MLP_UPLOADS) {
          return new Response(JSON.stringify({ success: false, error: 'R2 binding not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() }
          });
        }

        for (const entry of formData.entries()) {
          const [fieldName, value] = entry;
          // file inputs appear as File/Blob objects
          if (value instanceof File) {
            const file = value;
            // Basic validation
            if (file.size === 0) {
              return new Response(JSON.stringify({ success: false, error: 'Empty files are not allowed' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders() }
              });
            }
            if (file.size > MAX_FILE_BYTES) {
              return new Response(JSON.stringify({ success: false, error: 'File too large. Use signed uploads for large files.' }), {
                status: 413,
                headers: { 'Content-Type': 'application/json', ...corsHeaders() }
              });
            }
            if (file.type && ALLOWED_TYPES.length && !ALLOWED_TYPES.some(t => file.type === t || (t.endsWith('/*') && file.type.startsWith(t.split('/')[0] + '/')))) {
              // allow unknown types if not provided, but warn
              return new Response(JSON.stringify({ success: false, error: 'File type not allowed: ' + file.type }), {
                status: 415,
                headers: { 'Content-Type': 'application/json', ...corsHeaders() }
              });
            }

            // Generate a safe object key. Do not honor client paths.
            const randomHex = crypto.getRandomValues(new Uint8Array(8)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 150);
            const objectKey = `uploads/${Date.now()}-${randomHex}-${safeName}`;

            // Store in R2. Use streaming when possible.
            // Use file.stream() (supported in Workers) to avoid buffering large files in memory.
            await env.MLP_UPLOADS.put(objectKey, file.stream(), {
              httpMetadata: { contentType: file.type || 'application/octet-stream' },
              customMetadata: {
                originalName: file.name,
                fieldName: fieldName
              }
            });

            uploaded.push({ fieldName, originalName: file.name, size: file.size, contentType: file.type, objectKey });
          }
        }

        return new Response(JSON.stringify({ success: true, uploaded }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });
      }
    }

    // If not matched, return 404 to avoid exposing other behavior.
    return new Response('Not Found', { status: 404, headers: corsHeaders() });
  }
}

// CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}
