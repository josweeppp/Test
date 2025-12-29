export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only allow API routes
    if (!url.pathname.startsWith("/api/")) {
      return new Response("Not Found", { status: 404 });
    }

    // =========================
    // ADMIN LOGIN
    // =========================
    if (url.pathname === "/api/admin/login" && request.method === "POST") {
      const { email, password } = await request.json();

      if (
        email === env.ADMIN_EMAIL &&
        password === env.ADMIN_PASSWORD
      ) {
        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": `admin_session=${env.ADMIN_SESSION_SECRET}; Path=/; HttpOnly; Secure; SameSite=Strict`
            }
          }
        );
      }

      return new Response(
        JSON.stringify({ success: false }),
        { status: 401 }
      );
    }

    // =========================
    // ADMIN VERIFY
    // =========================
    if (url.pathname === "/api/admin/verify") {
      const cookie = request.headers.get("Cookie") || "";

      if (cookie.includes(`admin_session=${env.ADMIN_SESSION_SECRET}`)) {
        return new Response("OK", { status: 200 });
      }

      return new Response("Unauthorized", { status: 401 });
    }

    return new Response("Not Found", { status: 404 });
  }
};