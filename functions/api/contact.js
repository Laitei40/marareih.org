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
      mailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mailPayload)
      });

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
        JSON.stringify({ success: false, error: "Email send error" }),
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
