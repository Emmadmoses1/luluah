import { cache } from "react";
import { sql } from "./db";

export type StoreSettings = {
  announcement_ar: string; contact_email: string; contact_phone: string; whatsapp: string;
  address_ar: string; hours_ar: string; instagram: string; x: string; tiktok: string;
  snapchat: string; facebook: string; show_demo_notice: boolean; return_days: number;
};
export type PaymentSettings = { crypto_enabled: boolean; order_expiry_hours: number; instructions_ar: string };

export const DEFAULT_STORE: StoreSettings = {
  announcement_ar: "", contact_email: "", contact_phone: "", whatsapp: "", address_ar: "", hours_ar: "",
  instagram: "", x: "", tiktok: "", snapchat: "", facebook: "", show_demo_notice: true, return_days: 14,
};
export const DEFAULT_PAYMENTS: PaymentSettings = { crypto_enabled: true, order_expiry_hours: 24, instructions_ar: "" };

export const getSettings = cache(async () => {
  let rows: { key: string; value: Record<string, unknown> }[] = [];
  try { rows = await sql<{ key: string; value: Record<string, unknown> }[]>`select key, value from store_settings`; }
  catch { /* database unavailable: use defaults */ }
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? {};
  return {
    store: { ...DEFAULT_STORE, ...get("store") } as StoreSettings,
    payments: { ...DEFAULT_PAYMENTS, ...get("payments") } as PaymentSettings,
  };
});

export async function saveSetting(key: "store" | "payments", value: object) {
  await sql`insert into store_settings (key, value) values (${key}, ${JSON.stringify(value)}::jsonb)
            on conflict (key) do update set value = excluded.value`;
}

export function paymentsConfigured(): boolean {
  return Boolean(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET && process.env.SITE_URL);
}

export function safeUrl(u: string): string | null {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:" ? x.toString() : null;
  } catch { return null; }
}
