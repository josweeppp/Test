export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===============================
    // 1. REQUEST MAGIC LINK
    // ===============================
    if (url.pathname === "/api/auth/request" && request.method === "POST") {
      const { email } = await request.json();

      if (!email || !email.includes("@")) {
        return new Response("Invalid email", { status: 400 });
      }

      const token = crypto.randomUUID();
      const expiresIn = 15 * 60; // 15 minutes

      await env.USER_MAGIC_TOKENS.put(
        token,
        email,
        { expirationTtl: expiresIn }
      );

      const magicLink = `${url.origin}/api/auth/verify?token=${token}`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "SeoClub <login@seoclub.com>",
          to: email,
          subject: "Your secure login link",
          html: `
            <p>Click the link below to log in:</p>
            <p><a href="${magicLink}">${magicLink}</a></p>
            <p>This link expires in 15 minutes.</p>
          `
        })
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ===============================
    // 2. VERIFY MAGIC LINK
    // ===============================
    if (url.pathname === "/api/auth/verify") {
      const token = url.searchParams.get("token");
      if (!token) return new Response("Invalid token", { status: 400 });

      const email = await env.USER_MAGIC_TOKENS.get(token);
      if (!email) return new Response("Token expired or invalid", { status: 401 });

      await env.USER_MAGIC_TOKENS.delete(token);

      const session = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(email + env.SESSION_SECRET)
      );

      const sessionValue = [...new Uint8Array(session)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      return Response.redirect(
        `${url.origin}/dashboard.html`,
        302,
        {
          headers: {
            "Set-Cookie": `user_session=${sessionValue}; Path=/; HttpOnly; Secure; SameSite=Lax`
          }
        }
      );
    }

    // ===============================
    // 3. VERIFY SESSION (AJAX)
    // ===============================
    if (url.pathname === "/api/auth/session") {
      const cookie = request.headers.get("Cookie") || "";
      if (cookie.includes("user_session=")) {
        return new Response("OK");
      }
      return new Response("Unauthorized", { status: 401 });
    }

    return new Response("Not found", { status: 404 });
  }
};