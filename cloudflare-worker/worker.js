export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      })
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders()
      })
    }

    try {
      // Read form data from browser
      const formData = await request.formData()
      const params = new URLSearchParams()

      for (const [key, value] of formData.entries()) {
        params.append(key, value)
      }

      // 🔴 YOUR GOOGLE FORM formResponse URL (CORRECT)
      const GOOGLE_FORM_ACTION =
        'https://docs.google.com/forms/d/e/1FAIpQLSd-n0zujTqMeOxypcpCRnjYqiiIvdjaTIRkjEGULoYafsK-Jg/formResponse'

      // Forward submission to Google Forms
      const googleResp = await fetch(GOOGLE_FORM_ACTION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString(),
        redirect: 'manual' // IMPORTANT: Google returns 302 on success
      })

      // Google Forms success = 302 (sometimes 200)
      const success =
        googleResp.status === 302 || googleResp.status === 200

      return new Response(
        JSON.stringify({
          success,
          googleStatus: googleResp.status
        }),
        {
          status: success ? 200 : 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
          }
        }
      )
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
          }
        }
      )
    }
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
