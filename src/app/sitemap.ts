import type { MetadataRoute } from "next";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const fixed = ["", "/shop", "/about", "/contact", "/faq", "/shipping-policy", "/returns", "/privacy", "/terms", "/track"]
    .map((p) => ({ url: base + p }));
  try {
    const products = await sql<{ slug: string; updated_at: Date }[]>`select slug, updated_at from products where status = 'published'`;
    const cats = await sql<{ slug: string }[]>`select slug from categories where is_active`;
    return [
      ...fixed,
      ...cats.map((c) => ({ url: `${base}/category/${c.slug}` })),
      ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updated_at })),
    ];
  } catch { return fixed; }
}
