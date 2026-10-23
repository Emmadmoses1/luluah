import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { COINS, cryptoPrices } from "@/lib/crypto-rates";
import type { Unit } from "@/lib/converter";

export const dynamic = "force-dynamic";

/** Value of ONE unit of each currency in USD. Fiat comes from the store's rates, crypto from a public price feed. */
export async function GET() {
  const rows = await sql<{ code: string; decimals: number; rate_to_base: string | null; is_active: boolean }[]>`
    select code, decimals, rate_to_base, is_active from currencies where rate_to_base is not null`;
  const usdRow = rows.find((r) => r.code === "USD");
  const usdPerBhd = usdRow?.rate_to_base ? Number(usdRow.rate_to_base) : 0; // USD per 1 BHD
  if (!(usdPerBhd > 0)) return NextResponse.json({ error: "no USD rate" }, { status: 503 });

  const units: Unit[] = [{ code: "BHD", usd: usdPerBhd, decimals: 3, kind: "fiat" }, { code: "USD", usd: 1, decimals: 2, kind: "fiat" }];
  for (const r of rows) {
    if (!r.is_active || r.code === "BHD" || r.code === "USD") continue;
    const perBhd = Number(r.rate_to_base); // units of this currency per 1 BHD
    if (perBhd > 0) units.push({ code: r.code, usd: usdPerBhd / perBhd, decimals: r.decimals, kind: "fiat" });
  }
  const { prices, live } = await cryptoPrices();
  for (const c of COINS) if (prices[c.code]) units.push({ code: c.code, usd: prices[c.code], decimals: c.decimals, kind: "crypto" });
  return NextResponse.json({ units, updated: new Date().toISOString(), cryptoLive: live }, { headers: { "Cache-Control": "public, max-age=20" } });
}
