export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

      return new Response("Unauthorized", { status: 401 });
    }

    // =========================
    // PROTECT ALL /admin/*
    // =========================
    if (url.pathname.startsWith("/admin")) {
      const cookie = request.headers.get("Cookie") || "";

      if (!cookie.includes(`admin_session=${env.ADMIN_SESSION_SECRET}`)) {
        return Response.redirect(`${url.origin}/login.html`, 302);
      }
    }

    // =========================
    // PASS THROUGH TO PAGES
    // =========================
    return fetch(request);
  }
};