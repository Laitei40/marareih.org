export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Not allowed", { status: 405 });
    }

    const { name, email, message, token } = await request.json();

    if (!name || !email || !message || !token) {
      return Response.json({ success: false, error: "Missing fields" });
    }

    /* ---- Verify Turnstile ---- */
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
      } finally { clearTimeout(timer); }

      if (!verifyRes.ok) {
        const text = await verifyRes.text().catch(() => null);
        console.error('Turnstile non-OK response', verifyRes.status, text);
        return Response.json({ success: false, error: 'Turnstile service error', provider: { status: verifyRes.status, statusText: verifyRes.statusText, textSnippet: text ? text.slice(0,120) : null } });
      }

      try {
        verify = await verifyRes.json();
      } catch (e) {
        const text = await verifyRes.text().catch(() => null);
        console.error('Turnstile returned non-JSON', text);
        return Response.json({ success: false, error: 'Turnstile returned invalid response', textSnippet: text ? text.slice(0,120) : null });
      }

    } catch (err) {
      console.error('Turnstile fetch error:', err);
      return Response.json({ success: false, error: 'Turnstile request failed', details: String(err) });
    }

    if (!verify.success) {
      console.error("Turnstile verification failed:", verify);
      return Response.json({ success: false, error: "Verification failed", verify });
    }

    /* ---- Send email (MailChannels) ---- */
    const emailPayload = {
      personalizations: [{
        to: [{ email: "info@marareih.org" }]
      }],
      from: {
        email: "info@marareih.org",
        name: "Mara Language Preservation"
      },
      reply_to: {
        email,
        name
      },
      subject: "New Contact Message — Mara Language Preservation",
      content: [{
        type: "text/plain",
        value:
`Name: ${name}
Email: ${email}

Message:
${message}`
      }]
    };

    let mailRes;
    let mailResult = null;

    try {
      mailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload)
      });

      try {
        mailResult = await mailRes.json();
      } catch (e) {
        mailResult = null;
      }

      if (!mailRes.ok) {
        console.error("MailChannels failed:", mailRes.status, mailResult);
        let mailText = null;
        try {
          mailText = await mailRes.text();
        } catch (e) {
          mailText = null;
        }
        return Response.json({ success: false, error: "Email provider error", provider: { status: mailRes.status, statusText: mailRes.statusText, json: mailResult, textSnippet: mailText ? mailText.slice(0, 120) : null } });
      }

    } catch (err) {
      console.error("MailChannels request error:", err);
      return Response.json({ success: false, error: "Email send error", details: String(err) });
    }

    return Response.json({ success: true });
  }
};
