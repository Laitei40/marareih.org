export async function onRequestPost({ request, env }) {
  try {
    console.log('Contact POST invoked', { url: request.url, time: new Date().toISOString() });
export async function onRequestPost(ctx) {
  try {
    return await handleContact(ctx);
  } catch (err) {
    // Log the error and always return JSON
    console.error('Global handler error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Unhandled server error', details: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleContact({ request, env }) {
  // ...existing code...
}
    let verify;
