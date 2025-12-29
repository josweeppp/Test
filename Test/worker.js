export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* ===============================
       REQUEST MAGIC LINK
    =============================== */
    if (url.pathname === "/api/auth/request" && request.method === "POST") {
      const { email } = await request.json();

      if (!email) {
        return new Response("Email required", { status: 400 });
      }

      const token = crypto.randomUUID();
      const expires = Date.now() + 15 * 60 * 1000; // 15 min

      await env.USER_MAGIC_TOKENS.put(
        token,
        JSON.stringify({ email, expires }),
        { expirationTtl: 900 }
      );

      const link = `https://seoclub.pages.dev/api/auth/verify?token=${token}`;

      /* ---- SEND EMAIL ---- */
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "SeoClub <login@seoclub.pages.dev>",
          to: email,
          subject: "Your SeoClub login link",
          html: `
            <p>Click the link below to log in:</p>
            <p><a href="${link}">${link}</a></p>
            <p>This link expires in 15 minutes.</p>
          `
        })
      });

      if (!emailRes.ok) {
        return new Response("Failed to send email", { status: 500 });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    /* ===============================
       VERIFY MAGIC LINK
    =============================== */
    if (url.pathname === "/api/auth/verify") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response("Invalid token", { status: 400 });
      }

      const data = await env.USER_MAGIC_TOKENS.get(token);
      if (!data) {
        return new Response("Expired or invalid token", { status: 401 });
      }

      await env.USER_MAGIC_TOKENS.delete(token);

      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/",
          "Set-Cookie": [
            "user_session=1",
            "Path=/",
            "Domain=seoclub.pages.dev",
            "HttpOnly",
            "Secure",
            "SameSite=Lax",
            "Max-Age=86400"
          ].join("; ")
        }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};