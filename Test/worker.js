export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===== REQUEST LOGIN =====
    if (url.pathname === "/api/auth/request" && request.method === "POST") {
      const { email } = await request.json();
      if (!email) {
        return new Response("Email required", { status: 400 });
      }

      const token = crypto.randomUUID();
      await env.USER_MAGIC_TOKENS.put(token, email, { expirationTtl: 900 });

      const link = `${url.origin}/api/auth/verify?token=${token}`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "SeoClub <onboarding@resend.dev>",
          to: email,
          subject: "Your SeoClub login link",
          html: `<p>Click to login:</p><p><a href="${link}">${link}</a></p>`
        })
      });

      return Response.json({ success: true });
    }

    // ===== VERIFY LOGIN =====
    if (url.pathname === "/api/auth/verify") {
      const token = url.searchParams.get("token");
      if (!token) return new Response("Invalid token", { status: 400 });

      const email = await env.USER_MAGIC_TOKENS.get(token);
      if (!email) return new Response("Expired token", { status: 401 });

      await env.USER_MAGIC_TOKENS.delete(token);

      const headers = new Headers();
      headers.append(
        "Set-Cookie",
        `session=${email}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
      );
      headers.append("Location", "/");

      return new Response(null, { status: 302, headers });
    }

    // ===== CHECK SESSION =====
    if (url.pathname === "/api/auth/me") {
      const cookie = request.headers.get("Cookie") || "";
      const match = cookie.match(/session=([^;]+)/);
      if (!match) return Response.json({ loggedIn: false });

      return Response.json({ loggedIn: true, email: match[1] });
    }

    return new Response("Not found", { status: 404 });
  }
};