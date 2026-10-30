// Cloudflare Pages Function: proxy the public DEX Screener token-pairs endpoint.
// No secrets are required. This server-side proxy avoids direct browser CORS assumptions.
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const mint = url.searchParams.get("mint") || "";
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    return Response.json({ error: "A valid Solana mint address is required." }, { status: 400 });
  }
  const upstream = `https://api.dexscreener.com/token-pairs/v1/solana/${encodeURIComponent(mint)}`;
  try {
    const res = await fetch(upstream, { headers: { "Accept": "application/json" } });
    if (!res.ok) return Response.json({ error: "Market data provider unavailable." }, { status: 502 });
    const pairs = await res.json();
    return Response.json(
      { pairs: Array.isArray(pairs) ? pairs : [], source: "DEX Screener", fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, max-age=30", "Access-Control-Allow-Origin": "*" } }
    );
  } catch {
    return Response.json({ error: "Could not reach market data provider." }, { status: 502 });
  }
}
