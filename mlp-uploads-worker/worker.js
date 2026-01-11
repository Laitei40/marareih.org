export default {
  async fetch(request, env) {
    // ---------- CORS ----------
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);

    // ---------- ROUTE ----------
    if (url.pathname !== "/api/upload") {
      return new Response("Not Found", {
        status: 404,
        headers: corsHeaders(),
      });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method Not Allowed" }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(),
          },
        }
      );
    }

    // ---------- VALIDATION ----------
    let formData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError("Invalid multipart form data", 400);
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return jsonError("No file provided", 400);
    }

    const MAX_BYTES = 200 * 1024 * 1024; // 200 MB (match UI)
    if (file.size > MAX_BYTES) {
      return jsonError("File too large", 413);
    }

    // ---------- OBJECT KEY ----------
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `uploads/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    // ---------- UPLOAD ----------
    try {
      await env.MLP_UPLOADS.put(objectKey, file.stream(), {
        httpMetadata: {
          contentType: file.type || "application/octet-stream",
        },
      });
    } catch (err) {
      return jsonError("Upload failed", 500, err);
    }

    // ---------- SUCCESS ----------
    return new Response(
      JSON.stringify({
        success: true,
        key: objectKey,
        filename: file.name,
        size: file.size,
        type: file.type,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(),
        },
      }
    );
  },
};

// ---------- HELPERS ----------
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonError(message, status = 500, err = null) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      detail: err ? String(err.message || err) : undefined,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(),
      },
    }
  );
}
