import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { likeEscape, normAr, nsql } from "@/lib/arabic";

export async function GET(req: Request) {
  const raw = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (raw.length < 2) return NextResponse.json({ products: [], categories: [] });
  const like = `%${likeEscape(normAr(raw))}%`;
  const products = await sql<{ slug: string; name_ar: string; image: string | null }[]>`
    select p.slug, p.name_ar,
      (select coalesce(i.thumb_path, i.path) from product_images i where i.product_id = p.id order by i.sort_order, i.id limit 1) as image
    from products p
    where p.status = 'published' and (${nsql("p.name_ar")} like ${like} or lower(p.sku) like ${like})
    order by p.created_at desc limit 5`;
  const categories = await sql<{ slug: string; name_ar: string }[]>`
    select slug, name_ar from categories c where c.is_active and ${nsql("c.name_ar")} like ${like} order by sort_order limit 3`;
  return NextResponse.json({ products, categories });
}
