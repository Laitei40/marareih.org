export async function onRequest(context) {
  const { request } = context

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: cors()
    })
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: cors()
    })
  }

  return new Response(
    JSON.stringify({ ok: true, message: "Upload endpoint working" }),
    {
      headers: {
        "Content-Type": "application/json",
        ...cors()
      }
    }
  )
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
}
