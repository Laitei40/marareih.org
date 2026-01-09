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
        return Response.json({ success: false, error: "Email provider error", details: mailResult });
      }

    } catch (err) {
      console.error("MailChannels request error:", err);
      return Response.json({ success: false, error: "Email send error" });
    }

    return Response.json({ success: true });
  }
};
