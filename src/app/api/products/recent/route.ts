import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(req: Request) {
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "")
    .split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 80).slice(0, 8);
  if (slugs.length === 0) return NextResponse.json([]);
  const rows = await sql<{ slug: string; name_ar: string; price_minor: string; sale_price_minor: string | null; image: string | null }[]>`
    select p.slug, p.name_ar, p.price_minor, p.sale_price_minor,
      (select coalesce(i.thumb_path, i.path) from product_images i where i.product_id = p.id order by i.sort_order, i.id limit 1) as image
    from products p where p.status = 'published' and p.slug in ${sql(slugs)}`;
  const order = new Map(slugs.map((s, i) => [s, i]));
  rows.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
  return NextResponse.json(rows);
}
