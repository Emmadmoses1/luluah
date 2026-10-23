// Pure maths for the deposit converter and wallet limits. Everything is pivoted through USD.
export type Unit = { code: string; usd: number; decimals: number; kind: "fiat" | "crypto" };

/** How many `to` units equal `amount` of `from`. Returns null for unknown units or bad input. */
export function convertAmount(amount: number, from: string, to: string, units: Unit[]): number | null {
  const a = units.find((u) => u.code === from), b = units.find((u) => u.code === to);
  if (!a || !b || !Number.isFinite(amount) || amount < 0 || !(a.usd > 0) || !(b.usd > 0)) return null;
  return (amount * a.usd) / b.usd;
}

export function formatUnit(value: number, unit: Unit): string {
  return value.toLocaleString("en", { minimumFractionDigits: Math.min(unit.decimals, 2), maximumFractionDigits: unit.decimals });
}

export type DepositLimits = { min_minor: number; max_minor: number };

/** Validates a deposit in BHD fils against the admin limits. */
export function validateDeposit(minor: number, l: DepositLimits): "ok" | "invalid" | "min" | "max" {
  if (!Number.isInteger(minor) || minor <= 0) return "invalid";
  if (minor < l.min_minor) return "min";
  if (minor > l.max_minor) return "max";
  return "ok";
}

const ALLOWED = ["address", "amount_usd", "amount_crypto", "currency", "ref", "email"];

/**
 * Fills an on-ramp (card to crypto) link template. Only https links are accepted and every value is URL-encoded.
 * Placeholders: {address} {amount_usd} {amount_crypto} {currency} {ref} {email}
 */
export function buildOnrampUrl(template: string, vars: Record<string, string>): string | null {
  const used = [...template.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]);
  if (used.some((k) => !ALLOWED.includes(k))) return null;
  const url = template.replace(/\{([a-z_]+)\}/g, (_, k: string) => encodeURIComponent(vars[k] ?? ""));
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : null;
  } catch { return null; }
}
