import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { amountMatches, canTransition, mapProviderStatus, type OrderPay } from "@/lib/payments/status";
import type { PaymentInfo } from "@/lib/payments/nowpayments";
import { depositEmail } from "@/lib/email-templates";
import { logEmail, siteUrl } from "@/lib/mailer";
import { postEntry } from "@/lib/wallet";
import { formatBHD } from "@/lib/money";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 characters, matches the order reference format

/** A 12-character reference, unique across orders and deposits (the provider uses it as the order id). */
export async function newDepositRef(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    let ref = "";
    for (const b of randomBytes(12)) ref += ALPHABET[b % 32];
    const [o] = await sql`select 1 as x from orders where ref = ${ref}`;
    const [d] = await sql`select 1 as x from wallet_deposits where ref = ${ref}`;
    if (!o && !d) return ref;
  }
  throw new Error("could not create a unique deposit reference");
}

export async function isDepositRef(ref: string): Promise<boolean> {
  const [d] = await sql`select 1 as x from wallet_deposits where ref = ${ref}`;
  return Boolean(d);
}

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export type Credited = { accountId: string; depositId: string; email: string; name: string; amountMinor: number; balance: number };

/**
 * Applies a provider payment update to a deposit. The caller has ALREADY verified the webhook signature and asked the
 * provider for the real payment data. A deposit is credited only when the provider says the payment is finished, the
 * USD amount matches what we asked for, and the amount actually paid is not short. Anything odd is flagged for review.
 */
export async function applyDepositPayment(ref: string, paymentId: string, info: PaymentInfo): Promise<{ note: string; credited?: Credited }> {
  return sql.begin(async (tx) => {
    const [d] = await tx<{ id: string; account_id: string; amount_minor: string; usd_amount: string; status: string }[]>`
      select id, account_id, amount_minor, usd_amount, status from wallet_deposits where ref = ${ref} for update`;
    if (!d) return { note: "unknown deposit" };

    await tx`update wallet_deposits set provider_payment_id = ${paymentId}, pay_currency = coalesce(${info.pay_currency ?? null}, pay_currency),
      pay_amount = coalesce(${num(info.pay_amount)}, pay_amount), actually_paid = ${num(info.actually_paid)}, updated_at = now() where id = ${d.id}`;
    const flag = async (text: string) => {
      await tx`update wallet_deposits set flagged = true, note = concat_ws(E'\n', note, ${text}) where id = ${d.id}`;
    };

    let note = "";
    let mapped = mapProviderStatus(info.payment_status);
    const from = d.status as OrderPay;
    if (!mapped) note = `unrecognised status ${info.payment_status}`;

    const got = num(info.actually_paid), want = num(info.pay_amount);
    if (mapped === "paid") {
      if (!amountMatches(Number(d.usd_amount), Number(info.price_amount), String(info.price_currency ?? ""))) {
        mapped = null; note = "amount or currency mismatch: not credited";
        await flag(`[payment ${paymentId}] AMOUNT MISMATCH: review before crediting`);
      } else if (got !== null && want !== null && got < want * 0.995) {
        mapped = "partially_paid"; note = "underpaid";
      }
    }

    let credited: Credited | undefined;
    if (mapped && canTransition(from, mapped)) {
      await tx`update wallet_deposits set status = ${mapped}, updated_at = now() where id = ${d.id}`;
      note = `${from} -> ${mapped}`;
      if (mapped === "paid") {
        const r = await postEntry(tx, { accountId: d.account_id, kind: "deposit", amountMinor: Number(d.amount_minor), depositId: d.id, note: `Deposit ${ref}` });
        if (r.ok) {
          await tx`update wallet_deposits set credited_at = now() where id = ${d.id}`;
          const [a] = await tx<{ email: string; full_name: string }[]>`select email, full_name from accounts where id = ${d.account_id}`;
          credited = { accountId: d.account_id, depositId: d.id, email: a.email, name: a.full_name, amountMinor: Number(d.amount_minor), balance: r.balance };
          if (got !== null && want !== null && got > want * 1.01) await flag(`[payment ${paymentId}] OVERPAID by the customer: only the requested amount was credited`);
        } else note = "already credited";
      }
      if (mapped === "partially_paid") await flag(`[payment ${paymentId}] UNDERPAID: nothing credited, contact the customer`);
    } else if (!note) note = "no state change";
    return { note, credited };
  });
}

export async function notifyDepositCredited(c: Credited) {
  try {
    const m = depositEmail({ name: c.name, amount: formatBHD(c.amountMinor), balance: formatBHD(c.balance), siteUrl: siteUrl() });
    const ok = await sendEmail(c.email, m.subject, m.html);
    await logEmail(null, "deposit", c.email, ok);
  } catch { /* an email problem never blocks the credit */ }
}
