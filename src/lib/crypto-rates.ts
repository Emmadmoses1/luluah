// Indicative crypto prices (USD) for the deposit converter. The payment provider fixes the real amount when a deposit is created.
export const COINS: { code: string; id: string; decimals: number }[] = [
  { code: "USDT", id: "tether", decimals: 2 }, { code: "USDC", id: "usd-coin", decimals: 2 },
  { code: "BTC", id: "bitcoin", decimals: 8 }, { code: "ETH", id: "ethereum", decimals: 6 }, { code: "BNB", id: "binancecoin", decimals: 5 },
];

/** Reads CoinGecko's /simple/price reply into { USDT: 1.0, BTC: 60000, ... }. Unknown or invalid prices are skipped. */
export function parseCoinGecko(json: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!json || typeof json !== "object") return out;
  for (const c of COINS) {
    const v = Number((json as Record<string, { usd?: unknown }>)[c.id]?.usd);
    if (Number.isFinite(v) && v > 0) out[c.code] = v;
  }
  return out;
}

let cache: { at: number; prices: Record<string, number> } | null = null;

/** Cached for 60 s. If the service fails, the last good prices are used for up to 15 minutes. */
export async function cryptoPrices(): Promise<{ prices: Record<string, number>; live: boolean }> {
  const now = Date.now();
  if (cache && now - cache.at < 60_000) return { prices: cache.prices, live: true };
  try {
    const ids = COINS.map((c) => c.id).join(",");
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, { signal: AbortSignal.timeout(8000), headers: { accept: "application/json" } });
    if (r.ok) {
      const prices = parseCoinGecko(await r.json().catch(() => null));
      if (Object.keys(prices).length > 0) { cache = { at: now, prices }; return { prices, live: true }; }
    }
  } catch { /* fall through to the stale copy */ }
  if (cache && now - cache.at < 15 * 60_000) return { prices: cache.prices, live: false };
  return { prices: {}, live: false };
}
