import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { evaluateDiscount, normalizeCode, type DiscountRow } from "@/lib/discounts";
import { getSettings } from "@/lib/settings";
import { getDisplayCurrency } from "@/lib/currency-server";
import { HARD_MAX_QTY, limitsFor } from "@/lib/qty";

const Body = z.object({
  items: z.array(z.object({ variantId: z.string().uuid(), qty: z.number().int().min(1).max(HARD_MAX_QTY) })).max(50),
  code: z.string().max(40).optional(),
});

type Row = { id: string; size: string | null; color_ar: string | null; stock: number;
  slug: string; name_ar: string; price_minor: string; sale_price_minor: string | null; image: string | null };

// Prices, stock, quantity limits and discounts come ONLY from the database. The browser sends ids, quantities and a code.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { items, code } = parsed.data;
  const [{ store: cfg }, cur] = await Promise.all([getSettings(), getDisplayCurrency()]);
  const display = { code: cur.code, decimals: cur.decimals, rate: cur.rate };
  if (items.length === 0) return NextResponse.json({ lines: [], subtotalMinor: 0, discountMinor: 0, display });

  const want = new Map<string, number>();
  for (const i of items) want.set(i.variantId, Math.min((want.get(i.variantId) ?? 0) + i.qty, HARD_MAX_QTY));
  const ids = [...want.keys()];

  const rows = await sql<Row[]>`
    select v.id, v.size, v.color_ar, v.stock, p.slug, p.name_ar, p.price_minor, p.sale_price_minor,
      (select coalesce(i.thumb_path, i.path) from product_images i where i.product_id = p.id order by i.sort_order, i.id limit 1) as image
    from product_variants v join products p on p.id = v.product_id
    where p.status = 'published' and v.id in ${sql(ids)}`;
  const byId = new Map(rows.map((r) => [r.id, r]));

  let subtotalMinor = 0;
  const lines = [...want].map(([id, requested]) => {
    const r = byId.get(id);
    if (!r) {
      return { variantId: id, slug: "", name: "منتج لم يعد متوفراً", size: null, color: null,
        unitMinor: 0, qty: 0, requested, lineMinor: 0, available: false, image: null, minQty: 0, maxQty: 0 };
    }
    const unitMinor = Number(r.sale_price_minor ?? r.price_minor);
    const lim = limitsFor(r.stock, cfg.min_order_qty, cfg.max_order_qty);
    const qty = lim.max === 0 ? 0 : Math.min(lim.max, Math.max(lim.min, requested));
    const lineMinor = unitMinor * qty;
    subtotalMinor += lineMinor;
    return { variantId: id, slug: r.slug, name: r.name_ar, size: r.size, color: r.color_ar,
      unitMinor, qty, requested, lineMinor, available: qty > 0, image: r.image, minQty: lim.min, maxQty: lim.max };
  });

  let discountMinor = 0;
  let discountCode: string | null = null;
  let discountError: string | null = null;
  const c = code ? normalizeCode(code) : "";
  if (c) {
    const [d] = await sql<DiscountRow[]>`
      select id, code, kind, value, min_order_minor, max_uses, used_count, starts_at, ends_at, is_active
      from discounts where code = ${c}`;
    const res = evaluateDiscount(d, subtotalMinor);
    if (res.ok) { discountMinor = res.amountMinor; discountCode = res.code; }
    else discountError = res.error;
  }
  return NextResponse.json({ lines, subtotalMinor, discountMinor, discountCode, discountError, display });
}
