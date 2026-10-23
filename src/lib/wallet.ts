import { cache } from "react";
import type postgres from "postgres";
import { sql } from "@/lib/db";

export type Tx = postgres.TransactionSql;

export type WalletSettings = {
  enabled: boolean; min_minor: number; max_minor: number; daily_max_minor: number;
  card_enabled: boolean; card_url_template: string; card_pay_currency: string;
};
export const DEFAULT_WALLET: WalletSettings = {
  enabled: false, min_minor: 5000, max_minor: 1_000_000, daily_max_minor: 2_000_000,
  card_enabled: false, card_url_template: "", card_pay_currency: "usdttrc20",
};

export const getWalletSettings = cache(async (): Promise<WalletSettings> => {
  try {
    const [r] = await sql<{ value: unknown }[]>`select value from store_settings where key = 'wallet'`;
    const v = r && typeof r.value === "object" && r.value !== null && !Array.isArray(r.value) ? (r.value as Partial<WalletSettings>) : {};
    return { ...DEFAULT_WALLET, ...v };
  } catch { return DEFAULT_WALLET; }
});

export async function saveWalletSettings(v: WalletSettings) {
  await sql`insert into store_settings (key, value) values ('wallet', ${sql.json(v as never)})
            on conflict (key) do update set value = excluded.value`;
}

export async function getBalance(accountId: string): Promise<number> {
  const [w] = await sql<{ balance_minor: string }[]>`select balance_minor from wallets where account_id = ${accountId}`;
  return w ? Number(w.balance_minor) : 0;
}

export type Entry = {
  accountId: string; kind: "deposit" | "purchase" | "refund" | "adjustment"; amountMinor: number;
  depositId?: string; orderId?: string; note?: string; adminId?: string;
};

/**
 * The ONLY place where wallet money moves. Must run inside a transaction.
 * The wallet row is locked, the balance can never go below zero, and the unique indexes make a deposit, purchase
 * or refund happen at most once per deposit/order, so a repeated webhook can never credit twice.
 */
export async function postEntry(tx: Tx, p: Entry): Promise<{ ok: true; balance: number } | { ok: false; reason: "insufficient" | "duplicate" }> {
  await tx`insert into wallets (account_id) values (${p.accountId}) on conflict do nothing`;
  const [w] = await tx<{ balance_minor: string }[]>`select balance_minor from wallets where account_id = ${p.accountId} for update`;
  const next = Number(w.balance_minor) + p.amountMinor;
  if (next < 0) return { ok: false, reason: "insufficient" };
  const ins = await tx`
    insert into wallet_transactions (account_id, kind, amount_minor, balance_after_minor, deposit_id, order_id, note, created_by)
    values (${p.accountId}, ${p.kind}, ${p.amountMinor}, ${next}, ${p.depositId ?? null}, ${p.orderId ?? null}, ${p.note ?? null}, ${p.adminId ?? null})
    on conflict do nothing returning id`;
  if (ins.length === 0) return { ok: false, reason: "duplicate" };
  await tx`update wallets set balance_minor = ${next}, updated_at = now() where account_id = ${p.accountId}`;
  return { ok: true, balance: next };
}
