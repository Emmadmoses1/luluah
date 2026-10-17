import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { BH_REGIONS, shippingFor } from "@/lib/shipping";
import { evaluateDiscount, normalizeCode, type DiscountRow } from "@/lib/discounts";
import { sendEmail } from "@/lib/email";
import { adminNewOrderEmail, orderReceivedEmail } from "@/lib/email-templates";
import { formatMoney } from "@/lib/currency";

class Fail extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const LIVE = process.env.PAYMENTS_LIVE === "1";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 symbols, no look-alikes
const newRef = () => Array.from(randomBytes(12), (b) => ALPHABET[b & 31]).join("");
const ADDR_KEYS = ["region", "city", "area", "block", "road", "street", "building", "apartment", "postal", "landmark"];

const Body = z.object({
  items: z.array(z.object({ variantId: z.string().uuid(), qty: z.number().int().min(1).max(20) })).min(1).max(50),
  country: z.string().regex(/^[A-Z]{2}$/),
  customer: z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().max(200), phone: z.string().trim().min(5).max(30) }),
  address: z.record(z.string(), z.string()).default({}),
  notes: z.string().max(500).default(""),
  code: z.string().max(40).optional(),
});

function normalizePhone(raw: string, dial: string, bh: boolean): string | null {
  const ascii = raw.replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - 1632));
  const plus = ascii.trim().startsWith("+");
  let d = ascii.replace(/\D/g, "");
  if (d.startsWith("00" + dial)) d = d.slice(2 + dial.length);
  else if (plus && d.startsWith(dial)) d = d.slice(dial.length);
  d = d.replace(/^0+/, "");
  const okLen = bh ? d.length === 8 : d.length >= 6 && d.length <= 14;
  return okLen ? `+${dial}${d}` : null;
}

type Row = { id: string; size: string | null; color_ar: string | null; stock: number; vsku: string;
  name_ar: string; price_minor: string; sale_price_minor: string | null };

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "البيانات المدخلة غير صحيحة. يرجى مراجعة الحقول." }, { status: 400 });
  const b = parsed.data;
  const bad = (m: string) => NextResponse.json({ error: m }, { status: 400 });

  if (b.customer.email && !z.string().email().safeParse(b.customer.email).success) return bad("البريد الإلكتروني غير صالح.");
  const address: Record<string, string> = {};
  for (const k of ADDR_KEYS) { const v = (b.address[k] ?? "").trim().slice(0, 150); if (v) address[k] = v; }
  const BH = b.country === "BH";
  const need = BH ? ["region", "area", "block", "road", "building"] : ["city", "street"];
  if (need.some((k) => !address[k])) return bad("يرجى تعبئة جميع حقول العنوان المطلوبة.");
  if (BH && !BH_REGIONS.includes(address.region)) return bad("يرجى اختيار المحافظة.");

  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  const [rl] = await sql<{ n: string }[]>`
    select count(*) as n from orders where ip = ${ip} and created_at > now() - interval '1 hour'`;
  if (Number(rl.n) >= 10) return NextResponse.json({ error: "تم تجاوز عدد الطلبات المسموح به. حاول لاحقاً." }, { status: 429 });

  const want = new Map<string, number>();
  for (const i of b.items) want.set(i.variantId, Math.min((want.get(i.variantId) ?? 0) + i.qty, 20));
  const ids = [...want.keys()];
  const code = b.code ? normalizeCode(b.code) : "";

  try {
    const done = await sql.begin(async (tx) => {
      const [co] = await tx<{ iso2: string; dial_code: string; fee_minor: string; free_over_minor: string | null; min_order_minor: string }[]>`
        select iso2, dial_code, fee_minor, free_over_minor, min_order_minor from countries
        where iso2 = ${b.country} and delivery_enabled`;
      if (!co) throw new Fail(400, "التوصيل غير متاح حالياً لهذا البلد.");
      const phone = normalizePhone(b.customer.phone, co.dial_code, BH);
      if (!phone) throw new Fail(400, BH ? "رقم الهاتف يجب أن يتكون من 8 أرقام." : "رقم الهاتف غير صالح.");

      const rows = await tx<Row[]>`
        select v.id, v.size, v.color_ar, v.stock, v.sku as vsku, p.name_ar, p.price_minor, p.sale_price_minor
        from product_variants v join products p on p.id = v.product_id
        where p.status = 'published' and v.id in ${tx(ids)} for update of v`;
      const byId = new Map(rows.map((r) => [r.id, r]));

      let subtotal = 0;
      const lines = ids.map((id) => {
        const r = byId.get(id);
        const qty = want.get(id)!;
        if (!r) throw new Fail(409, "أحد المنتجات في سلتك لم يعد متوفراً. يرجى مراجعة السلة.");
        if (r.stock < qty) throw new Fail(409, `الكمية المطلوبة من «${r.name_ar}» غير متوفرة. يرجى تعديل السلة.`);
        const unit = Number(r.sale_price_minor ?? r.price_minor);
        subtotal += unit * qty;
        const label = [r.size, r.color_ar].filter((x) => x && x !== "—").join(" · ") || null;
        return { r, qty, unit, label };
      });

      if (subtotal < Number(co.min_order_minor)) {
        throw new Fail(400, "قيمة الطلب أقل من الحد الأدنى للتوصيل إلى هذا البلد.");
      }

      let discount = 0;
      let discountCode: string | null = null;
      if (code) {
        const [d] = await tx<DiscountRow[]>`
          select id, code, kind, value, min_order_minor, max_uses, used_count, starts_at, ends_at, is_active
          from discounts where code = ${code} for update`;
        const res = evaluateDiscount(d, subtotal);
        if (!res.ok) throw new Fail(400, res.error);
        const used = await tx`update discounts set used_count = used_count + 1
          where id = ${res.id} and (max_uses is null or used_count < max_uses) returning id`;
        if (used.length === 0) throw new Fail(409, "تم استخدام رمز الخصم بالكامل.");
        discount = res.amountMinor;
        discountCode = res.code;
      }

      const net = subtotal - discount;
      const shipping = shippingFor(
        { fee_minor: Number(co.fee_minor), free_over_minor: co.free_over_minor === null ? null : Number(co.free_over_minor) },
        net);
      const total = net + shipping;
      if (total <= 0) throw new Fail(400, "إجمالي الطلب غير صالح.");

      const newOrderRef = newRef();
      const [o] = await tx<{ id: string }[]>`
        insert into orders (ref, is_test, subtotal_minor, discount_minor, discount_code, shipping_minor, total_minor, customer_name,
          customer_email, customer_phone, country_iso2, address, notes, ip)
        values (${newOrderRef}, ${!LIVE}, ${subtotal}, ${discount}, ${discountCode}, ${shipping}, ${total}, ${b.customer.name},
          ${b.customer.email || null}, ${phone}, ${co.iso2}, ${JSON.stringify(address)}::jsonb,
          ${b.notes.trim() || null}, ${ip}) returning id`;
      for (const l of lines) {
        await tx`insert into order_items (order_id, variant_id, product_name, variant_label, sku, unit_minor, qty, line_minor)
                 values (${o.id}, ${l.r.id}, ${l.r.name_ar}, ${l.label}, ${l.r.vsku}, ${l.unit}, ${l.qty}, ${l.unit * l.qty})`;
        await tx`update product_variants set stock = stock - ${l.qty} where id = ${l.r.id}`;
      }
      return { ref: newOrderRef, total, country: co.iso2 };
    });

    const site = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
    try {
      if (b.customer.email) {
        const m = orderReceivedEmail({ name: b.customer.name, ref: done.ref, total: formatMoney(done.total), siteUrl: site });
        await sendEmail(b.customer.email, m.subject, m.html);
      }
      if (process.env.ADMIN_NOTIFY_EMAIL) {
        const a = adminNewOrderEmail({ ref: done.ref, total: formatMoney(done.total), country: done.country });
        await sendEmail(process.env.ADMIN_NOTIFY_EMAIL, a.subject, a.html);
      }
    } catch { /* email never blocks an order */ }
    return NextResponse.json({ ref: done.ref });
  } catch (e) {
    if (e instanceof Fail) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[checkout]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "حدث خطأ غير متوقع. حاول مرة أخرى." }, { status: 500 });
  }
}
