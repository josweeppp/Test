export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // =====================
    // ADMIN LOGIN API
    // =====================
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
              "Set-Cookie": [
                `admin_session=${env.ADMIN_SESSION_SECRET}`,
                "Path=/admin",
                "HttpOnly",
                "Secure",
                "SameSite=Strict"
              ].join("; ")
            }
          }
        );
      }

      return new Response("Unauthorized", { status: 401 });
    }

    // =====================
    // PROTECT /admin/*
    // =====================
    if (url.pathname.startsWith("/admin")) {

      // ✅ Allow login page without auth
      if (url.pathname === "/admin/login.html") {
        return fetch(request);
      }

      const cookieHeader = request.headers.get("Cookie") || "";
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => c.split("="))
      );

      if (cookies.admin_session !== env.ADMIN_SESSION_SECRET) {
        return Response.redirect(
          `${url.origin}/admin/login.html`,
          302
        );
      }
    }

    // =====================
    // PASS THROUGH
    // =====================
    return fetch(request);
  }
};