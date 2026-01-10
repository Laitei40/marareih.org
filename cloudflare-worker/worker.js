addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    })
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() })
  }

  try {
    const form = await request.formData()
    const params = new URLSearchParams()
    for (const [k, v] of form.entries()) params.append(k, v)

    // Replace FORM_ID below with your Google Form's ID
    const GOOGLE_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSd-n0zujTqMeOxypcpCRnjYqiiIvdjaTIRkjEGULoYafsK-Jg/formResponse'

    const resp = await fetch(GOOGLE_FORM_ACTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    // Return a simple JSON result back to the browser
    return new Response(JSON.stringify({ status: resp.status }), {
      status: 200,
      headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders())
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders()) })
  }
}

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
}
