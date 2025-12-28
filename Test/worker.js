export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ===== CORS =====
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });

    // =====================================================
    // AUTH / LOGIN (passwordless)
    // =====================================================
    if (url.pathname === "/api/login" && request.method === "POST") {
      const { email } = await request.json();
      if (!email) return json({ error: "Email required" }, 400);

      const sid = crypto.randomUUID();
      await env.SESSIONS.put(sid, email);

      return json({ sessionId: sid, email });
    }

    // =====================================================
    // BUY PRODUCT
    // =====================================================
    if (url.pathname === "/api/purchase" && request.method === "POST") {
      const sid = request.headers.get("Authorization");
      if (!sid) return json({ error: "Unauthorized" }, 401);

      const email = await env.SESSIONS.get(sid);
      if (!email) return json({ error: "Invalid session" }, 401);

      const { product } = await request.json();
      if (!product) return json({ error: "Product required" }, 400);

      const stockKey = `stock:${product}`;
      const stock = (await env.STOCK.get(stockKey, { type: "json" })) || [];

      if (stock.length === 0) {
        return json({ error: "Out of stock" }, 400);
      }

      const account = stock.shift();
      await env.STOCK.put(stockKey, JSON.stringify(stock));

      const [username, password] = account.split(":");

      const purchaseKey = `purchases:${email}`;
      const existing =
        (await env.PURCHASES.get(purchaseKey, { type: "json" })) || [];

      existing.push({
        product,
        username,
        password,
        date: Date.now(),
      });

      await env.PURCHASES.put(purchaseKey, JSON.stringify(existing));

      return json({
        success: true,
        product,
        username,
        password,
      });
    }

    // =====================================================
    // VIEW PURCHASES
    // =====================================================
    if (url.pathname === "/api/purchases" && request.method === "GET") {
      const sid = request.headers.get("Authorization");
      if (!sid) return json({ error: "Unauthorized" }, 401);

      const email = await env.SESSIONS.get(sid);
      if (!email) return json({ error: "Invalid session" }, 401);

      const purchases =
        (await env.PURCHASES.get(`purchases:${email}`, {
          type: "json",
        })) || [];

      return json(purchases);
    }

    // =====================================================
    // ADMIN – ADD STOCK
    // =====================================================
    if (url.pathname === "/api/admin/stock/add" && request.method === "POST") {
      const auth = request.headers.get("Authorization");
      if (auth !== "Bearer Josippp333") {
        return json({ error: "Forbidden" }, 403);
      }

      const { product, accounts } = await request.json();
      if (!product || !Array.isArray(accounts)) {
        return json({ error: "Invalid payload" }, 400);
      }

      const stockKey = `stock:${product}`;
      const existing =
        (await env.STOCK.get(stockKey, { type: "json" })) || [];

      const updated = existing.concat(accounts);
      await env.STOCK.put(stockKey, JSON.stringify(updated));

      return json({
        success: true,
        product,
        added: accounts.length,
        total: updated.length,
      });
    }

    // =====================================================
    // ADMIN – SETTINGS
    // =====================================================
    if (url.pathname === "/api/admin/settings" && request.method === "POST") {
      const auth = request.headers.get("Authorization");
      if (auth !== "Bearer Josippp333") {
        return json({ error: "Forbidden" }, 403);
      }

      const settings = await request.json();
      await env.PURCHASES.put("settings:global", JSON.stringify(settings));

      return json({ success: true });
    }

    if (url.pathname === "/api/settings" && request.method === "GET") {
      const settings =
        (await env.PURCHASES.get("settings:global", { type: "json" })) || {};
      return json(settings);
    }

    // =====================================================
    // ADMIN – ADS
    // =====================================================
    if (url.pathname === "/api/admin/ads" && request.method === "POST") {
      const auth = request.headers.get("Authorization");
      if (auth !== "Bearer Josippp333") {
        return json({ error: "Forbidden" }, 403);
      }

      const ads = await request.json();
      await env.PURCHASES.put("ads:global", JSON.stringify(ads));

      return json({ success: true });
    }

    if (url.pathname === "/api/ads" && request.method === "GET") {
      const ads =
        (await env.PURCHASES.get("ads:global", { type: "json" })) || {};
      return json(ads);
    }

    // =====================================================
    // WEBHOOK STATUS (simple status store)
    // =====================================================
    if (url.pathname === "/api/webhook/status" && request.method === "POST") {
      const data = await request.json();
      await env.PURCHASES.put(
        "webhook:last",
        JSON.stringify({
          ...data,
          date: Date.now(),
        })
      );
      return json({ success: true });
    }

    if (url.pathname === "/api/webhook/status" && request.method === "GET") {
      const status =
        (await env.PURCHASES.get("webhook:last", { type: "json" })) || {};
      return json(status);
    }

    // =====================================================
    return json({ error: "Not found" }, 404);
  },
};