addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

const ADMIN_TOKEN = "Bearer josippp333" // change this

async function handleRequest(request) {
  const url = new URL(request.url)

  // ===== CORS =====
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders()
    })
  }

  // ===== ROUTES =====

  // LOGIN
  if (url.pathname === "/api/login" && request.method === "POST") {
    const { email } = await request.json()
    if (!email) return json({ error: "Email required" }, 400)

    const sid = crypto.randomUUID()
    await SESSIONS.put(sid, email)

    return json({ sessionId: sid, email })
  }

  // PURCHASE PRODUCT
  if (url.pathname === "/api/purchase" && request.method === "POST") {
    const sid = request.headers.get("Authorization")
    if (!sid) return json({ error: "Unauthorized" }, 401)

    const email = await SESSIONS.get(sid)
    if (!email) return json({ error: "Invalid session" }, 401)

    const { product } = await request.json()
    if (!product) return json({ error: "Product required" }, 400)

    const stockKey = `stock:${product}`
    const stock = (await STOCK.get(stockKey, { type: "json" })) || []

    if (stock.length === 0) {
      return json({ error: "Out of stock" }, 400)
    }

    const account = stock.shift()
    await STOCK.put(stockKey, JSON.stringify(stock))

    const [username, password] = account.split(":")

    const purchaseKey = `purchases:${email}`
    const purchases = (await PURCHASES.get(purchaseKey, { type: "json" })) || []

    purchases.push({
      product,
      username,
      password,
      date: Date.now()
    })

    await PURCHASES.put(purchaseKey, JSON.stringify(purchases))

    return json({ success: true, username, password })
  }

  // GET PURCHASES
  if (url.pathname === "/api/purchases" && request.method === "GET") {
    const sid = request.headers.get("Authorization")
    if (!sid) return json({ error: "Unauthorized" }, 401)

    const email = await SESSIONS.get(sid)
    if (!email) return json({ error: "Invalid session" }, 401)

    const purchases = (await PURCHASES.get(`purchases:${email}`, { type: "json" })) || []
    return json(purchases)
  }

  // ===== ADMIN: ADD STOCK =====
  if (url.pathname === "/api/admin/stock/add" && request.method === "POST") {
    const auth = request.headers.get("Authorization")
    if (auth !== ADMIN_TOKEN) {
      return json({ error: "Forbidden" }, 403)
    }

    const { product, accounts } = await request.json()
    if (!product || !Array.isArray(accounts)) {
      return json({ error: "Invalid payload" }, 400)
    }

    const stockKey = `stock:${product}`
    const existing = (await STOCK.get(stockKey, { type: "json" })) || []

    const updated = existing.concat(accounts)
    await STOCK.put(stockKey, JSON.stringify(updated))

    return json({
      success: true,
      product,
      added: accounts.length,
      total: updated.length
    })
  }

  // ===== ADS (stored in PURCHASES KV to avoid extra namespace) =====
  if (url.pathname === "/api/ads" && request.method === "GET") {
    const ads = (await PURCHASES.get("ads", { type: "json" })) || []
    return json(ads)
  }

  if (url.pathname === "/api/admin/ads" && request.method === "POST") {
    adminOnly(request)
    const ads = await request.json()
    await PURCHASES.put("ads", JSON.stringify(ads))
    return json({ success: true })
  }

  // ===== SETTINGS =====
  if (url.pathname === "/api/settings" && request.method === "GET") {
    const settings = (await PURCHASES.get("settings", { type: "json" })) || {}
    return json(settings)
  }

  if (url.pathname === "/api/admin/settings" && request.method === "POST") {
    adminOnly(request)
    const settings = await request.json()
    await PURCHASES.put("settings", JSON.stringify(settings))
    return json({ success: true })
  }

  // ===== WEBHOOK STATUS =====
  if (url.pathname === "/api/webhooks/status" && request.method === "GET") {
    const status = (await PURCHASES.get("webhook_status", { type: "json" })) || {
      enabled: false
    }
    return json(status)
  }

  if (url.pathname === "/api/admin/webhooks/status" && request.method === "POST") {
    adminOnly(request)
    const status = await request.json()
    await PURCHASES.put("webhook_status", JSON.stringify(status))
    return json({ success: true })
  }

  return json({ error: "Not found" }, 404)
}

// ===== HELPERS =====

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
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  }
}

function adminOnly(request) {
  const auth = request.headers.get("Authorization")
  if (auth !== ADMIN_TOKEN) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })
  }
}