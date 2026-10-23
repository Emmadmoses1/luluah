"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth";
import { parseBhd } from "@/lib/money";
import { buildOnrampUrl } from "@/lib/converter";
import { paymentsConfigured } from "@/lib/settings";
import { emailConfigured } from "@/lib/mailer";
import { postEntry, saveWalletSettings, type WalletSettings } from "@/lib/wallet";
import { refundOrderToWallet } from "@/lib/wallet-pay";

const MANAGERS: ("owner" | "manager")[] = ["owner", "manager"];
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const go = (q: string): never => redirect(`/admin/wallet?${q}`);

export async function saveWalletConfig(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const min = parseBhd(str(fd, "min")), max = parseBhd(str(fd, "max")), daily = parseBhd(str(fd, "daily"));
  if (min === null || max === null || daily === null || min < 1000 || min > max || max > daily || daily > 100_000_000) return go("error=limits");
  const enabled = fd.get("enabled") === "on";
  const cardEnabled = fd.get("card_enabled") === "on";
  const template = str(fd, "card_url_template").slice(0, 600);
  const payCurrency = str(fd, "card_pay_currency").toLowerCase();
  if (!/^[a-z0-9]{2,20}$/.test(payCurrency)) return go("error=currency");
  if (cardEnabled) {
    const sample = buildOnrampUrl(template, { address: "ADDR", amount_usd: "1", amount_crypto: "1", currency: payCurrency, ref: "REF", email: "a@b.co" });
    if (!sample) return go("error=template");
  }
  if (enabled && !emailConfigured()) return go("error=email");
  if (enabled && !paymentsConfigured()) return go("error=payments");
  const next: WalletSettings = { enabled, min_minor: min, max_minor: max, daily_max_minor: daily, card_enabled: cardEnabled, card_url_template: template, card_pay_currency: payCurrency };
  await saveWalletSettings(next);
  await audit(admin.id, "wallet.settings", { enabled, cardEnabled, min, max, daily });
  return go("saved=1");
}

export async function adjustWallet(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const email = str(fd, "email").toLowerCase();
  const raw = str(fd, "amount");
  const neg = raw.startsWith("-");
  const abs = parseBhd(raw.replace(/^[-+]/, ""));
  const reason = str(fd, "reason").slice(0, 200);
  if (!email || abs === null || abs <= 0 || abs > 100_000_000 || reason.length < 3) return go("error=adjust");
  const [a] = await sql<{ id: string }[]>`select id from accounts where email = ${email}`;
  if (!a) return go("error=noaccount");
  const r = await sql.begin((tx) => postEntry(tx, { accountId: a.id, kind: "adjustment", amountMinor: neg ? -abs : abs, note: reason, adminId: admin.id }));
  if (!r.ok) return go("error=insufficient");
  await audit(admin.id, "wallet.adjust", { account: a.id, amount: neg ? -abs : abs, reason });
  return go("saved=1");
}

export async function refundOrderAction(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const ref = str(fd, "ref").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^LU/, "");
  if (!/^[A-Z2-9]{12}$/.test(ref)) return go("error=ref");
  const r = await refundOrderToWallet(ref, admin.id);
  await audit(admin.id, "wallet.refund", { ref, ok: r.ok });
  return go(r.ok ? "saved=1" : `error=refund&m=${encodeURIComponent(r.error).slice(0, 120)}`);
}

export async function setAccountFlag(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().parse(fd.get("id"));
  const action = z.enum(["verify", "block", "unblock"]).parse(fd.get("action"));
  if (action === "verify") await sql`update accounts set email_verified_at = coalesce(email_verified_at, now()) where id = ${id}`;
  else await sql`update accounts set status = ${action === "block" ? "blocked" : "active"} where id = ${id}`;
  await audit(admin.id, `account.${action}`, { id });
  return go("saved=1");
}
