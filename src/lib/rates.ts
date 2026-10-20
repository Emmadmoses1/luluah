/** Reads a "latest rates" reply (base BHD) and returns rate strings for the wanted currency codes. */
export function parseRates(json: unknown, wanted: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const j = json as { result?: string; rates?: Record<string, unknown> } | null;
  if (!j || (j.result !== undefined && j.result !== "success") || typeof j.rates !== "object" || j.rates === null) return out;
  for (const code of wanted) {
    const v = Number(j.rates[code]);
    if (code !== "BHD" && Number.isFinite(v) && v > 0 && v < 1_000_000) out[code] = String(Number(v.toFixed(8)));
  }
  return out;
}
