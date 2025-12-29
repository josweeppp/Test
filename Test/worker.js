export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===============================
    // REQUEST LOGIN (send email)
    // ===============================
    if (url.pathname === "/api/auth/request" && request.method === "POST") {
      const { email } = await request.json();

      if (!email) {
        return new Response("Email required", { status: 400 });
      }

      const token = crypto.randomUUID();

      await env.USER_MAGIC_TOKENS.put(
        token,
        JSON.stringify({ email }),
        { expirationTtl: 600 } // 10 minutes
      );

      const loginLink = `${url.origin}/api/auth/verify?token=${token}`;

      await sendEmail(env, email, loginLink);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // ===============================
    // VERIFY LOGIN LINK
    // ===============================
    if (url.pathname === "/api/auth/verify") {
      const token = url.searchParams.get("token");
      if (!token) return new Response("Invalid token", { status: 400 });

      const record = await env.USER_MAGIC_TOKENS.get(token);
      if (!record) return new Response("Expired token", { status: 401 });

      const { email } = JSON.parse(record);

      await env.USER_MAGIC_TOKENS.delete(token);

      const sessionId = crypto.randomUUID();

      await env.SESSIONS.put(
        sessionId,
        JSON.stringify({ email }),
        { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
      );

      return new Response(null, {
        status: 302,
        headers: {
          "Set-Cookie": `session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax`,
          "Location": "/account.html"
        }
      });
    }

    // ===============================
    // GET CURRENT USER
    // ===============================
    if (url.pathname === "/api/me") {
      const cookie = request.headers.get("Cookie") || "";
      const match = cookie.match(/session=([^;]+)/);

      if (!match) {
        return new Response(JSON.stringify({ user: null }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      const session = await env.SESSIONS.get(match[1]);
      if (!session) {
        return new Response(JSON.stringify({ user: null }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(
        JSON.stringify({ user: JSON.parse(session) }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Not found", { status: 404 });
  }
};

// ===============================
// EMAIL (RESEND)
// ===============================
async function sendEmail(env, to, link) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "SeoClub <onboarding@resend.dev>",
      to,
      subject: "Your SeoClub login link",
      html: `
        <p>Click to login:</p>
        <p><a href="${link}">${link}</a></p>
        <p>This link expires in 10 minutes.</p>
      `
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Email failed: " + text);
  }
}