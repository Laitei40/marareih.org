export async function onRequestPost({ request, env }) {
  try {
    console.log('Contact POST invoked', { url: request.url, time: new Date().toISOString() });

    const { name, email, message, token } = await request.json();

    if (!name || !email || !message || !token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify Turnstile (with timeout and robust error handling)
    const formData = new FormData();
    formData.append("secret", env.TURNSTILE_SECRET);
    formData.append("response", token);

    let verifyRes;
    let verify;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        verifyRes = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          { method: "POST", body: formData, signal: ctrl.signal }
        );
      } finally {
        clearTimeout(timer);
      }

      if (!verifyRes.ok) {
        const text = await verifyRes.text().catch(() => null);
        console.error('Turnstile non-OK response', verifyRes.status, text);
        return new Response(
          JSON.stringify({ success: false, error: 'Turnstile service error', provider: { status: verifyRes.status, statusText: verifyRes.statusText, textSnippet: text ? text.slice(0,120) : null } }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      try {
        verify = await verifyRes.json();
      } catch (e) {
        const text = await verifyRes.text().catch(() => null);
        console.error('Turnstile returned non-JSON', text);
        return new Response(
          JSON.stringify({ success: false, error: 'Turnstile returned invalid response', textSnippet: text ? text.slice(0,120) : null }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

    } catch (err) {
      console.error('Turnstile fetch error:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Turnstile request failed', details: String(err) }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!verify.success) {
      console.error("Turnstile verification failed:", verify);
      return new Response(
        JSON.stringify({ success: false, error: "Turnstile verification failed", verify }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send email (MailChannels)
    const mailPayload = {
      personalizations: [
        { to: [{ email: "info@marareih.org" }] }
      ],
      from: {
        email: "noreply@marareih.org",
        name: "Mara Language Preservation"
      },
      reply_to: {
        email,
        name
      },
      subject: "New Contact Message — MLP",
      content: [
        {
          type: "text/plain",
          value:
`Name: ${name}
Email: ${email}

Message:
${message}`
        }
      ]
    };

    let mailRes;
    let mailResult = null;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        mailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mailPayload),
          signal: ctrl.signal
        });
      } finally {
        clearTimeout(timer);
      }

      try {
        mailResult = await mailRes.json();
      } catch (e) {
        // non-JSON response
        mailResult = null;
      }

      if (!mailRes.ok) {
        console.error("MailChannels failed:", mailRes.status, mailResult);
        // Attempt to include a short text snippet for easier debugging
        let mailText = null;
        try {
          mailText = await mailRes.text();
        } catch (e) {
          mailText = null;
        }
        return new Response(
          JSON.stringify({
            success: false,
            error: "Email provider error",
            provider: {
              status: mailRes.status,
              statusText: mailRes.statusText,
              json: mailResult,
              textSnippet: mailText ? mailText.slice(0, 120) : null
            }
          }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

    } catch (err) {
      console.error("MailChannels request error:", err);
      return new Response(
        JSON.stringify({ success: false, error: "Email send error", details: String(err) }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
