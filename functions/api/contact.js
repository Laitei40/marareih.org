export async function onRequestPost({ request, env }) {
  try {
    const { name, email, message, token } = await request.json();

    if (!name || !email || !message || !token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify Turnstile
    const formData = new FormData();
    formData.append("secret", env.TURNSTILE_SECRET);
    formData.append("response", token);

    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: formData }
    );

    const verify = await verifyRes.json();

    if (!verify.success) {
      return new Response(
        JSON.stringify({ success: false, error: "Turnstile verification failed" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send email (MailChannels)
    await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      })
    });

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
