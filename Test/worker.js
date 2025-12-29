export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===============================
    // REQUEST MAGIC LINK
    // ===============================
    if (url.pathname === "/api/auth/request" && request.method === "POST") {
      const { email } = await request.json();

      if (!email) {
        return new Response("Email required", { status: 400 });
      }

      const token = crypto.randomUUID();

      // Store token → email (15 min)
      await env.USER_MAGIC_TOKENS.put(token, email, {
        expirationTtl: 900,
      });

      const link = `${url.origin}/api/auth/verify?token=${token}`;

      // TEMP: log instead of email (for testing)
      console.log("MAGIC LOGIN LINK:", link);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // ===============================
    // VERIFY MAGIC LINK
    // ===============================
    if (url.pathname === "/api/auth/verify") {
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response("Invalid token", { status: 400 });
      }

      const email = await env.USER_MAGIC_TOKENS.get(token);
      if (!email) {
        return new Response("Token expired", { status: 401 });
      }

      // One-time use
      await env.USER_MAGIC_TOKENS.delete(token);

      return new Response(null, {
        status: 302,
        headers: {
          "Set-Cookie": `user_session=${email}; Path=/; HttpOnly; Secure; SameSite=Lax`,
          "Location": "/",
        },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};