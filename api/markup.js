export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const adminPassword = process.env.MARKUP_ADMIN_PASSWORD;
  const markupPat = process.env.MARKUP_PAT_TOKEN;
  const allowedAppIds = new Set([
    "34EcACZ8mm5javRC4tauK", // Web App — OAuth 2.0
    "33yWXtr1ROjZynlte2ojP"    // Software App — PAT Token
  ]);

  if (!adminPassword || !markupPat) {
    return res.status(500).json({
      ok: false,
      error: "Server markup configuration is incomplete. Set MARKUP_PAT_TOKEN and MARKUP_ADMIN_PASSWORD in Vercel Environment Variables."
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  body = body || {};

  const suppliedPassword = String(body.password || "");
  if (suppliedPassword !== adminPassword) {
    return res.status(401).json({ ok: false, error: "Incorrect password." });
  }

  if (body.action === "validate") {
    return res.status(200).json({ ok: true });
  }

  if (body.action !== "stats") {
    return res.status(400).json({ ok: false, error: "Invalid action." });
  }

  const appId = String(body.app_id || "");
  if (!allowedAppIds.has(appId)) {
    return res.status(400).json({ ok: false, error: "Invalid markup App ID." });
  }

  const dateFrom = String(body.date_from || "");
  const dateTo = String(body.date_to || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return res.status(400).json({ ok: false, error: "Invalid date range." });
  }

  const url = `https://api.derivws.com/applications/v1/markup-statistics?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "Deriv-App-ID": appId,
        "Authorization": `Bearer ${markupPat}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch (_) { data = null; }

    if (!upstream.ok) {
      const apiMsg = data?.error?.message || data?.error || data?.message || text.slice(0, 300);
      return res.status(upstream.status).json({ ok: false, error: String(apiMsg) });
    }

    if (!data || !data.data || typeof data.data !== "object") {
      return res.status(502).json({ ok: false, error: "Unexpected markup response format." });
    }

    // Deriv returns aggregate totals at data.* and per-application values
    // inside data.breakdown[]. The root totals include all applications and
    // must NOT be shown when the admin selected one specific App ID.
    const breakdown = Array.isArray(data.data.breakdown) ? data.data.breakdown : [];
    const selected = breakdown.find(row => String(row?.app_id || "") === appId);

    if (!selected) {
      return res.status(404).json({
        ok: false,
        error: `No markup statistics were returned for App ID ${appId}.`,
        app_id: appId,
        available_app_ids: breakdown
          .map(row => String(row?.app_id || ""))
          .filter(Boolean)
      });
    }

    return res.status(200).json({
      ok: true,
      app_id: appId,
      data: {
        total_app_markup_usd: Number(selected.app_markup_usd ?? 0),
        total_volume_usd: Number(selected.volume_usd ?? 0),
        total_payout_usd: Number(selected.payout_usd ?? 0),
        total_contract_count: Number(selected.contract_count ?? 0),
        total_client_count: Number(selected.client_count ?? 0),
        breakdown: [selected]
      }
    });
  } catch (err) {
    return res.status(502).json({ ok: false, error: `Deriv request failed: ${err.message || err}` });
  }
}
