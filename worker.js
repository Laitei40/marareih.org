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

    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: formData }
    );

    const verify = await verifyRes.json();
    if (!verify.success) {
      return Response.json({ success: false, error: "Verification failed" });
    }

    /* ---- Send email (MailChannels) ---- */
    const emailPayload = {
      personalizations: [{
        to: [{ email: "teiteipara@gmail.com" }]
      }],
    from: {
    email: "info@marareih.org",
    name: "Mara Language Preservation"
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

    const mailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload)
    });

    if (!mailRes.ok) {
      return Response.json({ success: false, error: "Email failed" });
    }

    return Response.json({ success: true });
  }
};
