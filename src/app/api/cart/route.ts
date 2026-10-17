import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";

const Body = z.object({
  items: z.array(z.object({ variantId: z.string().uuid(), qty: z.number().int().min(1).max(20) })).max(50),
});

type Row = { id: string; size: string | null; color_ar: string | null; stock: number;
  slug: string; name_ar: string; price_minor: string; sale_price_minor: string | null };

// Prices and stock come ONLY from the database. The browser sends ids and quantities.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const items = parsed.data.items;
  if (items.length === 0) return NextResponse.json({ lines: [], subtotalMinor: 0 });

  const want = new Map<string, number>();
  for (const i of items) want.set(i.variantId, (want.get(i.variantId) ?? 0) + i.qty);
  const ids = [...want.keys()];

  const rows = await sql<Row[]>`
    select v.id, v.size, v.color_ar, v.stock, p.slug, p.name_ar, p.price_minor, p.sale_price_minor
    from product_variants v join products p on p.id = v.product_id
    where p.status = 'published' and v.id in ${sql(ids)}`;
  const byId = new Map(rows.map((r) => [r.id, r]));

  let subtotalMinor = 0;
  const lines = [...want].map(([id, requested]) => {
    const r = byId.get(id);
    if (!r) {
      return { variantId: id, slug: "", name: "منتج لم يعد متوفراً", size: null, color: null,
        unitMinor: 0, qty: 0, requested, lineMinor: 0, available: false };
    }
    const unitMinor = Number(r.sale_price_minor ?? r.price_minor);
    const qty = Math.min(requested, r.stock, 20);
    const lineMinor = unitMinor * qty;
    subtotalMinor += lineMinor;
    return { variantId: id, slug: r.slug, name: r.name_ar, size: r.size, color: r.color_ar,
      unitMinor, qty, requested, lineMinor, available: qty > 0 };
  });
  return NextResponse.json({ lines, subtotalMinor });
}
