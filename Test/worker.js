addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // ---- CORS ----
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() })
  }

  // ======================
  // AUTH (USER)
  // ======================
  if (url.pathname === "/api/login" && request.method === "POST") {
    const { email } = await request.json()
    if (!email) return json({ error: "Email required" }, 400)

    const sid = crypto.randomUUID()
    await SESSIONS.put(sid, email)

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        ...corsHeaders(),
        "Set-Cookie": `session=${sid}; Path=/; HttpOnly; Secure; SameSite=Strict`
      }
    })
  }

  // ======================
  // AUTH (ADMIN)
  // ======================
  if (url.pathname === "/api/admin/login" && request.method === "POST") {
    const { email, secret } = await request.json()

    if (email !== ADMIN_EMAIL || secret !== ADMIN_SECRET) {
      return json({ error: "Forbidden" }, 403)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        ...corsHeaders(),
        "Set-Cookie":
          "admin_session=valid; Path=/; HttpOnly; Secure; SameSite=Strict"
      }
    })
  }

  // ======================
  // PRODUCTS (PUBLIC)
  // ======================
  if (url.pathname === "/api/products" && request.method === "GET") {
    const products = (await PURCHASES.get("products", { type: "json" })) || []
    return json(products)
  }

  // ======================
  // PURCHASE
  // ======================
  if (url.pathname === "/api/purchase" && request.method === "POST") {
    const email = await requireUser(request)
    const { product } = await request.json()

    const key = `stock:${product}`
    const stock = (await STOCK.get(key, { type: "json" })) || []

    if (stock.length === 0) {
      return json({ error: "Out of stock" }, 400)
    }

    const account = stock.shift()
    await STOCK.put(key, JSON.stringify(stock))

    const purchasesKey = `purchases:${email}`
    const purchases =
      (await PURCHASES.get(purchasesKey, { type: "json" })) || []

    purchases.push({
      product,
      account,
      date: Date.now()
    })

    await PURCHASES.put(purchasesKey, JSON.stringify(purchases))

    return json({ success: true, account })
  }

  // ======================
  // ADMIN: ADD STOCK
  // ======================
  if (url.pathname === "/api/admin/stock" && request.method === "POST") {
    requireAdmin(request)

    const { product, accounts } = await request.json()
    if (!product || !Array.isArray(accounts)) {
      return json({ error: "Invalid payload" }, 400)
    }

    const key = `stock:${product}`
    const existing = (await STOCK.get(key, { type: "json" })) || []
    const updated = existing.concat(accounts)

    await STOCK.put(key, JSON.stringify(updated))

    return json({ success: true, total: updated.length })
  }

  // ======================
  // ADMIN: PRODUCTS
  // ======================
  if (url.pathname === "/api/admin/products" && request.method === "POST") {
    requireAdmin(request)
    const products = await request.json()
    await PURCHASES.put("products", JSON.stringify(products))
    return json({ success: true })
  }

  // ======================
  // ADMIN: ADS
  // ======================
  if (url.pathname === "/api/admin/ads" && request.method === "POST") {
    requireAdmin(request)
    const ads = await request.json()
    await PURCHASES.put("ads", JSON.stringify(ads))
    return json({ success: true })
  }

  if (url.pathname === "/api/ads" && request.method === "GET") {
    const ads = (await PURCHASES.get("ads", { type: "json" })) || {}
    return json(ads)
  }

  // ======================
  // ADMIN: SETTINGS
  // ======================
  if (url.pathname === "/api/admin/settings" && request.method === "POST") {
    requireAdmin(request)
    const settings = await request.json()
    await PURCHASES.put("settings", JSON.stringify(settings))
    return json({ success: true })
  }

  if (url.pathname === "/api/settings" && request.method === "GET") {
    const settings =
      (await PURCHASES.get("settings", { type: "json" })) || {}
    return json(settings)
  }

  return json({ error: "Not found" }, 404)
}

// ======================
// HELPERS
// ======================
function requireAdmin(request) {
  const cookie = request.headers.get("Cookie") || ""
  if (!cookie.includes("admin_session=valid")) {
    throw new Response("Forbidden", { status: 403 })
  }
}

async function requireUser(request) {
  const cookie = request.headers.get("Cookie") || ""
  const match = cookie.match(/session=([^;]+)/)
  if (!match) throw new Response("Unauthorized", { status: 401 })

  const email = await SESSIONS.get(match[1])
  if (!email) throw new Response("Unauthorized", { status: 401 })
  return email
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  })
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
}