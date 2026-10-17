import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSettings, paymentsConfigured } from "@/lib/settings";
import { createInvoice } from "@/lib/payments/nowpayments";
import { bhdMinorToUsdCents } from "@/lib/payments/status";

export const runtime = "nodejs";

const err = (m: string, status: number) => NextResponse.json({ error: m }, { status });
const trusted = (u: string) => {
  try { const x = new URL(u); return x.protocol === "https:" && x.hostname.endsWith("nowpayments.io"); }
  catch { return false; }
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { ref?: unknown } | null;
  const ref = typeof body?.ref === "string" ? body.ref : "";
  if (!/^[A-Z2-9]{12}$/.test(ref)) return err("رقم الطلب غير صحيح.", 400);

  const { payments } = await getSettings();
  if (!payments.crypto_enabled || !paymentsConfigured()) {
    return err("الدفع بالعملات الرقمية غير متاح حالياً. سنتواصل معك لإتمام الدفع.", 503);
  }

  const [o] = await sql<{ id: string; total_minor: string; payment_status: string; fulfillment_status: string }[]>`
    select id, total_minor, payment_status, fulfillment_status from orders where ref = ${ref}`;
  if (!o) return err("الطلب غير موجود.", 404);
  if (o.fulfillment_status === "cancelled" || !["unpaid", "pending"].includes(o.payment_status)) {
    return err("لا يمكن الدفع لهذا الطلب حالياً.", 409);
  }
  const total = Number(o.total_minor);
  if (!(total > 0)) return err("إجمالي الطلب غير صالح.", 400);

  const [existing] = await sql<{ invoice_url: string | null }[]>`
    select invoice_url from payments
    where order_id = ${o.id} and provider = 'nowpayments' and status in ('created','waiting') and invoice_url is not null
    order by created_at desc limit 1`;
  if (existing?.invoice_url && trusted(existing.invoice_url)) return NextResponse.json({ url: existing.invoice_url });

  const [cnt] = await sql<{ n: string }[]>`select count(*) as n from payments where order_id = ${o.id}`;
  if (Number(cnt.n) >= 5) return err("تم تجاوز عدد محاولات الدفع لهذا الطلب. تواصل معنا.", 429);

  const [usd] = await sql<{ rate_to_base: string | null }[]>`select rate_to_base from currencies where code = 'USD'`;
  const rate = usd?.rate_to_base ? Number(usd.rate_to_base) : 0;
  if (!(rate > 0)) return err("تعذّر تحديد سعر الصرف. تواصل معنا.", 503);
  const cents = bhdMinorToUsdCents(total, rate);
  const amountUsd = (cents / 100).toFixed(2);
  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/+$/, "");

  try {
    const inv = await createInvoice({ amountUsd, orderRef: ref, description: `Luluah order ${ref}`, siteUrl });
    if (!inv?.invoice_url || !trusted(inv.invoice_url)) throw new Error("unexpected invoice response");
    await sql`insert into payments (order_id, provider, provider_invoice_id, status, price_minor, price_amount, price_currency, invoice_url)
              values (${o.id}, 'nowpayments', ${String(inv.id)}, 'created', ${total}, ${amountUsd}, 'usd', ${inv.invoice_url})`;
    await sql`update orders set payment_status = 'pending', updated_at = now() where id = ${o.id} and payment_status = 'unpaid'`;
    return NextResponse.json({ url: inv.invoice_url });
  } catch (e) {
    console.error("[payments/create]", e instanceof Error ? e.message : e);
    return err("تعذّر إنشاء عملية الدفع. حاول مرة أخرى بعد قليل.", 502);
  }
}
