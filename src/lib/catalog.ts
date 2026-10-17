import { sql } from "./db";
import { likeEscape, normAr, nsql } from "./arabic";
import type { CardProduct } from "@/components/ProductCard";

export const PAGE_SIZE = 12;

export type Filters = {
  q?: string; cat?: string; min?: number | null; max?: number | null;
  size?: string; color?: string; stock?: boolean; sort?: string; page?: number;
};
export type ListResult = {
  products: CardProduct[]; total: number; sizes: string[]; colors: string[]; hasPopular: boolean;
};

export async function listProducts(f: Filters): Promise<ListResult> {
  const like = f.q ? `%${likeEscape(normAr(f.q.trim()))}%` : null;
  const page = Math.max(1, f.page ?? 1);

  const where = sql`p.status = 'published'
    ${f.cat ? sql`and exists (select 1 from product_categories pc where pc.product_id = p.id and pc.category_id = ${f.cat})` : sql``}
    ${like ? sql`and (${nsql("p.name_ar")} like ${like} or ${nsql("p.description_ar")} like ${like} or lower(p.sku) like ${like}
        or exists (select 1 from product_categories pc2 join categories c2 on c2.id = pc2.category_id
                   where pc2.product_id = p.id and ${nsql("c2.name_ar")} like ${like}))` : sql``}
    ${f.min != null ? sql`and coalesce(p.sale_price_minor, p.price_minor) >= ${f.min}` : sql``}
    ${f.max != null ? sql`and coalesce(p.sale_price_minor, p.price_minor) <= ${f.max}` : sql``}
    ${f.size ? sql`and exists (select 1 from product_variants v where v.product_id = p.id and v.size = ${f.size})` : sql``}
    ${f.color ? sql`and exists (select 1 from product_variants v where v.product_id = p.id and v.color_ar = ${f.color})` : sql``}
    ${f.stock ? sql`and exists (select 1 from product_variants v where v.product_id = p.id and v.stock > 0)` : sql``}`;

  const order =
    f.sort === "price_asc" ? sql`coalesce(p.sale_price_minor, p.price_minor) asc`
    : f.sort === "price_desc" ? sql`coalesce(p.sale_price_minor, p.price_minor) desc`
    : f.sort === "popular" ? sql`(select coalesce(sum(oi.qty), 0) from order_items oi
          join orders o on o.id = oi.order_id join product_variants v on v.id = oi.variant_id
          where v.product_id = p.id and o.payment_status = 'paid' and not o.is_test) desc, p.created_at desc`
    : sql`p.created_at desc`;

  const products = await sql<CardProduct[]>`
    select p.slug, p.name_ar, p.price_minor, p.sale_price_minor,
      (select coalesce(i.thumb_path, i.path) from product_images i where i.product_id = p.id order by i.sort_order, i.id limit 1) as image,
      exists (select 1 from product_variants v where v.product_id = p.id and v.stock > 0) as in_stock
    from products p where ${where} order by ${order}
    limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`;
  const [{ n }] = await sql<{ n: string }[]>`select count(*) as n from products p where ${where}`;

  const scope = f.cat
    ? sql`and exists (select 1 from product_categories pc where pc.product_id = p.id and pc.category_id = ${f.cat})`
    : sql``;
  const sizes = await sql<{ v: string }[]>`
    select distinct v.size as v from product_variants v join products p on p.id = v.product_id
    where p.status = 'published' and v.size is not null and v.size <> '' and v.size <> '—' ${scope} order by 1`;
  const colors = await sql<{ v: string }[]>`
    select distinct v.color_ar as v from product_variants v join products p on p.id = v.product_id
    where p.status = 'published' and v.color_ar is not null and v.color_ar <> '' and v.color_ar <> '—' ${scope} order by 1`;
  const [pop] = await sql<{ e: boolean }[]>`
    select exists (select 1 from orders where payment_status = 'paid' and not is_test) as e`;

  return { products, total: Number(n), sizes: sizes.map((s) => s.v), colors: colors.map((c) => c.v), hasPopular: pop.e };
}
