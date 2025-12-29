export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // =========================
    // CONFIG (CHANGE THESE)
    // =========================
    const ADMIN_EMAIL = env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
    const COOKIE_NAME = "admin_session";

    // =========================
    // HELPERS
    // =========================
    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    const redirect = (to) =>
      new Response(null, {
        status: 302,
        headers: { Location: to },
      });

    const getCookie = (req, name) => {
      const cookie = req.headers.get("Cookie");
      if (!cookie) return null;
      const match = cookie.match(new RegExp(`${name}=([^;]+)`));
      return match ? match[1] : null;
    };

    const isAuthed = () =>
      getCookie(request, COOKIE_NAME) === "true";

    // =========================
    // ADMIN LOGIN
    // =========================
    if (path === "/api/admin/login" && request.method === "POST") {
      const form = await request.formData();
      const email = form.get("email");
      const password = form.get("password");

      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        return new Response(null, {
          status: 302,
          headers: {
            "Set-Cookie":
              `${COOKIE_NAME}=true; HttpOnly; Secure; SameSite=Strict; Path=/`,
            Location: "/admin/index.html",
          },
        });
      }

      return redirect("/admin/login.html?error=1");
    }

    // =========================
    // ADMIN VERIFY (JS GUARD)
    // =========================
    if (path === "/api/admin/verify") {
      if (!isAuthed()) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("OK");
    }

    // =========================
    // ADMIN LOGOUT
    // =========================
    if (path === "/api/admin/logout") {
      return new Response(null, {
        status: 302,
        headers: {
          "Set-Cookie":
            `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`,
          Location: "/admin/login.html",
        },
      });
    }

    // =========================
    // PROTECT ADMIN PAGES
    // =========================
    if (path.startsWith("/admin") && path !== "/admin/login.html") {
      if (!isAuthed()) {
        return redirect("/admin/login.html");
      }
    }

    // =========================
    // DEFAULT (STATIC ASSETS)
    // =========================
    return env.ASSETS.fetch(request);
  },
};