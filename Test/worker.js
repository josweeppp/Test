export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===============================
    // MAGIC LINK REQUEST
    // ===============================
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

      const link = `${url.origin}/api/auth/verify?token=${token}`;

      // TEMP: log link (later you email it)
      console.log("MAGIC LOGIN LINK:", link);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // ===============================
    // MAGIC LINK VERIFY
    // ===============================
    if (url.pathname === "/api/auth/verify") {
      const token = url.searchParams.get("token");
      if (!token) return new Response("Invalid token", { status: 400 });

      const data = await env.USER_MAGIC_TOKENS.get(token);
      if (!data) return new Response("Expired or invalid", { status: 401 });

      await env.USER_MAGIC_TOKENS.delete(token);

      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/",
          "Set-Cookie": "user_session=1; Path=/; HttpOnly; Secure; SameSite=Lax"
        }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};