var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// cloudflare-worker/worker.js
var worker_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }
    const url = new URL(request.url);
    const pathname = url.pathname || "/";
    const staticExt = /\.(css|js|png|jpe?g|svg|ico|woff2?|ttf|eot)$/i;
    if (pathname.startsWith("/upload/") || staticExt.test(pathname)) {
      try {
        return await fetch(request);
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: "Origin fetch failed", detail: String(err && err.message ? err.message : err) }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders() }
        });
      }
    }
    if (pathname === "/api/upload/init") {
      if (request.method !== "POST") {
        return new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders() }
        });
      }
      try {
        const body = await request.json().catch(() => null);
        if (!body) return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders() } });
        const { filename, size, type } = body;
        if (!filename || typeof filename !== "string") return new Response(JSON.stringify({ success: false, error: "Missing filename" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders() } });
        if (!size || typeof size !== "number" || size <= 0) return new Response(JSON.stringify({ success: false, error: "Invalid size" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders() } });
        const MAX_BYTES = Number(env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024 * 1024;
        if (size > MAX_BYTES) return new Response(JSON.stringify({ success: false, error: "File too large" }), { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders() } });
        const ACCOUNT_ID = env.R2_ACCOUNT_ID;
        const BUCKET = env.R2_BUCKET_NAME;
        const ACCESS_KEY = env.R2_ACCESS_KEY_ID;
        const SECRET_KEY = env.R2_SECRET_ACCESS_KEY;
        if (!ACCOUNT_ID || !BUCKET || !ACCESS_KEY || !SECRET_KEY) {
          return new Response(JSON.stringify({ success: false, error: "R2 signing keys not configured" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders() } });
        }
        const categoryOverride = body.category && String(body.category) || null;
        const prefix = choosePrefix({ filename, type, categoryOverride });
        const uuid = generateUUID();
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
        const objectKey = `${prefix}${Date.now()}-${uuid}-${safeName}`;
        const expires = Math.min(60 * 60, Number(env.SIGNED_URL_EXPIRES) || 900);
        const endpoint = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
        const method = "PUT";
        const protocol = "https://";
        const host = endpoint;
        const path = `/${BUCKET}/${encodeURIComponent(objectKey)}`;
        const uploadUrl = await generatePresignedUrlV4({
          accessKeyId: ACCESS_KEY,
          secretAccessKey: SECRET_KEY,
          region: "auto",
          service: "s3",
          host,
          method,
          path,
          expires,
          payloadHash: "UNSIGNED-PAYLOAD"
        });
        return new Response(JSON.stringify({ success: true, uploadUrl, objectKey }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders() } });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: String(err && err.message ? err.message : err) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders() } });
      }
    }
    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  }
};
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-MLP-Worker": "true"
  };
}
__name(corsHeaders, "corsHeaders");
async function generatePresignedUrlV4({ accessKeyId, secretAccessKey, region, service, host, method, path, expires, payloadHash }) {
  const now = /* @__PURE__ */ new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const params = new URLSearchParams();
  params.set("X-Amz-Algorithm", algorithm);
  params.set("X-Amz-Credential", `${accessKeyId}/${credentialScope}`);
  params.set("X-Amz-Date", amzDate);
  params.set("X-Amz-Expires", String(expires));
  params.set("X-Amz-SignedHeaders", "host");
  params.set("X-Amz-Content-Sha256", payloadHash || "UNSIGNED-PAYLOAD");
  const canonicalQuerystring = params.toString();
  const canonicalHeaders = `host:${host}
`;
  const signedHeaders = "host";
  const canonicalRequest = [
    method,
    path,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash || "UNSIGNED-PAYLOAD"
  ].join("\n");
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join("\n");
  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacBinary(kDate, region);
  const kService = await hmacBinary(kRegion, service);
  const kSigning = await hmacBinary(kService, "aws4_request");
  const signature = await hmacHex(kSigning, stringToSign);
  params.set("X-Amz-Signature", signature);
  return `https://${host}${path}?${params.toString()}`;
}
__name(generatePresignedUrlV4, "generatePresignedUrlV4");
function toAmzDate(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}
__name(toAmzDate, "toAmzDate");
function choosePrefix({ filename, type, categoryOverride }) {
  const normalized = /* @__PURE__ */ __name((s) => (s || "").toLowerCase(), "normalized");
  const ext = normalized(filename).split(".").pop();
  const t = normalized(type || "");
  const allowed = /* @__PURE__ */ new Set(["audio", "docs", "images", "photos", "other", "others", "videos"]);
  if (categoryOverride && allowed.has(categoryOverride.replace(/\/$/, ""))) {
    const c = categoryOverride.replace(/\/$/, "");
    if (c === "other") return "others/";
    return `${c}/`;
  }
  if (t.startsWith("audio") || ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)) return "audio/";
  if (t.startsWith("video") || ["mp4", "mov", "mkv", "webm", "avi"].includes(ext)) return "videos/";
  if (["pdf", "doc", "docx", "txt", "csv", "json", "md", "rtf"].includes(ext) || t.startsWith("text") || t === "application/pdf" || t.includes("officedocument")) return "docs/";
  if (["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext)) return "photos/";
  if (t.startsWith("image") || ["svg", "gif", "bmp", "tif", "tiff"].includes(ext)) return "images/";
  if (["zip", "gz", "tar", "7z"].includes(ext)) return "others/";
  return "others/";
}
__name(choosePrefix, "choosePrefix");
async function hmac(keyData, msg) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return new Uint8Array(sig);
}
__name(hmac, "hmac");
async function hmacBinary(keyBytes, msg) {
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg));
  return new Uint8Array(sig);
}
__name(hmacBinary, "hmacBinary");
async function hmacHex(keyBytes, msg) {
  const sig = await hmacBinary(keyBytes, msg);
  return bufferToHex(sig.buffer);
}
__name(hmacHex, "hmacHex");
function bufferToHex(buf) {
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
__name(bufferToHex, "bufferToHex");
function generateUUID() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
__name(generateUUID, "generateUUID");

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-NjgCLy/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-NjgCLy/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
