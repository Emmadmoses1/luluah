import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyIpn } from "@/lib/payments/sig";
import { amountMatches, canTransition, mapProviderStatus, type OrderPay } from "@/lib/payments/status";
import { getPayment, type PaymentInfo } from "@/lib/payments/nowpayments";
import { sendEmail } from "@/lib/email";
import { adminNewOrderEmail, paymentConfirmedEmail } from "@/lib/email-templates";
import { formatMoney } from "@/lib/currency";

export const runtime = "nodejs";

type OrderRow = { id: string; ref: string; payment_status: string; fulfillment_status: string;
  total_minor: string; customer_name: string; customer_email: string | null; country_iso2: string };
type PayRow = { id: string; status: string; price_amount: string };
type Outcome = { note: string; paidNow?: { ref: string; name: string; email: string | null; total: string; country: string } };

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function POST(req: Request) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !process.env.NOWPAYMENTS_API_KEY) return new NextResponse("not configured", { status: 503 });

  const raw = await req.text();
  if (raw.length > 100_000) return new NextResponse("too large", { status: 413 });
  let payload: Record<string, unknown>;
  try { payload = JSON.parse(raw); } catch { return new NextResponse("bad json", { status: 400 }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return new NextResponse("bad json", { status: 400 });

  if (!verifyIpn(payload as Parameters<typeof verifyIpn>[0], req.headers.get("x-nowpayments-sig"), secret)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const paymentId = String(payload.payment_id ?? "");
  const status = String(payload.payment_status ?? "");
  if (!paymentId || !status) return new NextResponse("missing fields", { status: 400 });
  const eventKey = `${paymentId}:${status}:${String(payload.updated_at ?? "")}`;

  // Idempotency: a repeated delivery of the same event is acknowledged and ignored.
  const ins = await sql`insert into payment_events (provider, event_key, status, payload)
    values ('nowpayments', ${eventKey}, ${status}, ${raw}::jsonb) on conflict (provider, event_key) do nothing returning id`;
  if (ins.length === 0) return NextResponse.json({ ok: true, duplicate: true });

  const release = async () => { try { await sql`delete from payment_events where provider = 'nowpayments' and event_key = ${eventKey}`; } catch {} };

  try {
    // Never trust the webhook body for status or amounts: ask the provider directly.
    let info: PaymentInfo;
    try { info = await getPayment(paymentId); }
    catch (e) { console.error("[webhook] verify failed", e instanceof Error ? e.message : e); await release(); return new NextResponse("verification failed", { status: 502 }); }

    const ref = String(info.order_id ?? "");
    if (!/^[A-Z2-9]{12}$/.test(ref) || (payload.order_id !== undefined && String(payload.order_id) !== ref)) {
      await sql`update payment_events set note = 'order reference mismatch' where provider = 'nowpayments' and event_key = ${eventKey}`;
      return NextResponse.json({ ok: true, ignored: true });
    }

    const outcome = await sql.begin(async (tx): Promise<Outcome> => {
      const [o] = await tx<OrderRow[]>`
        select id, ref, payment_status, fulfillment_status, total_minor, customer_name, customer_email, country_iso2
        from orders where ref = ${ref} for update`;
      if (!o) return { note: "unknown order" };
      const [p] = await tx<PayRow[]>`
        select id, status, price_amount from payments
        where order_id = ${o.id} and provider = 'nowpayments'
        order by (provider_payment_id = ${paymentId}) desc nulls last, created_at desc limit 1`;
      if (!p) return { note: "no payment request for this order" };

      await tx`update payments set status = ${info.payment_status}, provider_payment_id = ${paymentId},
        pay_currency = ${info.pay_currency ?? null}, pay_amount = ${num(info.pay_amount)},
        actually_paid = ${num(info.actually_paid)}, updated_at = now() where id = ${p.id}`;

      const flag = async (text: string) => {
        await tx`update orders set admin_notes = concat_ws(E'\n', admin_notes, ${text}), updated_at = now() where id = ${o.id}`;
      };

      let note = "";
      let paidNow: Outcome["paidNow"];
      let mapped = mapProviderStatus(info.payment_status);
      const from = o.payment_status as OrderPay;

      if (!mapped) note = `unrecognised status ${info.payment_status}`;
      if (mapped === "paid") {
        const okAmount = amountMatches(Number(p.price_amount), Number(info.price_amount), String(info.price_currency ?? ""));
        const got = num(info.actually_paid), want = num(info.pay_amount);
        if (!okAmount) {
          mapped = null; note = "amount or currency mismatch: not marked paid";
          await flag(`[payment ${paymentId}] AMOUNT MISMATCH — review manually before fulfilling`);
        } else if (got !== null && want !== null && got < want * 0.995) {
          mapped = "partially_paid"; note = "underpaid";
        }
      }

      if (mapped && canTransition(from, mapped)) {
        await tx`update orders set payment_status = ${mapped},
          paid_at = case when ${mapped === "paid"}::boolean then now() else paid_at end, updated_at = now() where id = ${o.id}`;
        note = `${from} -> ${mapped}`;
        if (mapped === "paid") {
          paidNow = { ref: o.ref, name: o.customer_name, email: o.customer_email, total: formatMoney(o.total_minor), country: o.country_iso2 };
          if (o.fulfillment_status === "cancelled") {
            await flag(`[payment ${paymentId}] PAID AFTER CANCELLATION — refund the customer or reinstate the order manually`);
          }
        }
        if (mapped === "partially_paid") await flag(`[payment ${paymentId}] UNDERPAID — contact the customer; do not fulfil`);
        if ((mapped === "failed" || mapped === "expired") && o.fulfillment_status === "new") {
          const rel = await tx`update orders set stock_released = true, fulfillment_status = 'cancelled'
            where id = ${o.id} and stock_released = false returning id`;
          if (rel.length > 0) {
            await tx`update product_variants v set stock = v.stock + i.qty
                     from order_items i where i.order_id = ${o.id} and i.variant_id = v.id`;
          }
        }
      } else if (!note) {
        if (mapped === "paid" && from === "paid" && p.status !== "finished") {
          await flag(`[payment ${paymentId}] DUPLICATE PAYMENT received on an already paid order — refund one`);
          note = "duplicate payment flagged";
        } else note = "no state change";
      }

      await tx`update payment_events set payment_id = ${p.id}, note = ${note}
               where provider = 'nowpayments' and event_key = ${eventKey}`;
      return { note, paidNow };
    });

    if (outcome.paidNow) {
      const site = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
      try {
        if (outcome.paidNow.email) {
          const m = paymentConfirmedEmail({ name: outcome.paidNow.name, ref: outcome.paidNow.ref, siteUrl: site });
          await sendEmail(outcome.paidNow.email, m.subject, m.html);
        }
        if (process.env.ADMIN_NOTIFY_EMAIL) {
          const a = adminNewOrderEmail({ ref: outcome.paidNow.ref, total: outcome.paidNow.total, country: outcome.paidNow.country });
          await sendEmail(process.env.ADMIN_NOTIFY_EMAIL, "PAID: " + a.subject, a.html);
        }
      } catch { /* email problems never fail the webhook */ }
    }
    return NextResponse.json({ ok: true, note: outcome.note });
  } catch (e) {
    console.error("[webhook]", e instanceof Error ? e.message : e);
    await release();
    return new NextResponse("error", { status: 500 });
  }
}
