"use server";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth";
import { parseBhd } from "@/lib/money";
import { resolveArabic } from "@/lib/translate";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isDup = (e: unknown) => (e as { code?: string })?.code === "23505";
const MANAGERS: ("owner" | "manager")[] = ["owner", "manager"];
const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

export async function createProduct(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const back = (q: string): never => redirect(`/admin/products/new?${q}`);

  const nameEn = str(fd, "name_en", 200);
  const descEn = str(fd, "description_en", 5000);
  const slug = z.string().trim().max(80).regex(SLUG).safeParse(fd.get("slug"));
  const sku = z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/).safeParse(fd.get("sku"));
  const status = z.enum(["draft", "published"]).safeParse(fd.get("status"));
  if (!nameEn || !slug.success || !sku.success || !status.success) return back("error=fields");

  const price = parseBhd(String(fd.get("price") ?? ""));
  const saleRaw = String(fd.get("sale_price") ?? "").trim();
  const sale = saleRaw === "" ? null : parseBhd(saleRaw);
  if (price === null || price <= 0 || (saleRaw !== "" && (sale === null || sale >= price))) return back("error=price");

  const variants: { size: string | null; colorEn: string; colorAr: string; stock: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const size = str(fd, `size_${i}`, 40);
    const colorEn = str(fd, `color_en_${i}`, 40);
    const colorAr = str(fd, `color_ar_${i}`, 40);
    if (!size && !colorEn && !colorAr) continue;
    const stock = Number(String(fd.get(`stock_${i}`) ?? "0").trim() || "0");
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return back("error=stock");
    variants.push({ size: size || null, colorEn, colorAr, stock });
  }
  if (variants.length === 0) return back("error=variant");

  const res = await resolveArabic([
    { en: nameEn, ar: str(fd, "name_ar", 200) },
    { en: descEn, ar: str(fd, "description_ar", 5000) },
    ...variants.map((v) => ({ en: v.colorEn, ar: v.colorAr })),
  ]);
  if (!res.ok) return back(`error=${res.error}`);
  const [nameAr, descAr, ...colorsAr] = res.ar;
  if (!nameAr) return back("error=fields");

  const cats = fd.getAll("cat").map(String).filter((c) => z.string().uuid().safeParse(c).success);
  let id = "";
  try {
    id = await sql.begin(async (tx) => {
      const [p] = await tx<{ id: string }[]>`
        insert into products (slug, sku, name_ar, name_en, description_ar, description_en, price_minor, sale_price_minor, status, is_featured)
        values (${slug.data}, ${sku.data}, ${nameAr}, ${nameEn}, ${descAr}, ${descEn || null}, ${price}, ${sale},
                ${status.data}, ${fd.get("is_featured") === "on"}) returning id`;
      for (const [i, v] of variants.entries()) {
        await tx`insert into product_variants (product_id, sku, size, color_ar, color_en, stock)
                 values (${p.id}, ${sku.data + "-" + (i + 1)}, ${v.size}, ${colorsAr[i] || null}, ${v.colorEn || null}, ${v.stock})`;
      }
      for (const c of cats) {
        await tx`insert into product_categories (product_id, category_id) values (${p.id}, ${c}) on conflict do nothing`;
      }
      return p.id;
    });
  } catch (e) {
    if (isDup(e)) return back("error=duplicate");
    throw e;
  }
  await audit(admin.id, "product.create", { id, sku: sku.data, status: status.data });
  redirect(`/admin/products/${id}?saved=1`);
}

export async function updateProduct(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().parse(fd.get("id"));
  const back = (q: string): never => redirect(`/admin/products/${id}?${q}`);

  const nameEn = str(fd, "name_en", 200);
  const descEn = str(fd, "description_en", 5000);
  const retranslate = fd.get("retranslate") === "on";
  const status = z.enum(["draft", "published", "archived"]).safeParse(fd.get("status"));
  if (!status.success) return back("error=fields");

  const price = parseBhd(String(fd.get("price") ?? ""));
  const saleRaw = String(fd.get("sale_price") ?? "").trim();
  const sale = saleRaw === "" ? null : parseBhd(saleRaw);
  if (price === null || price <= 0 || (saleRaw !== "" && (sale === null || sale >= price))) return back("error=price");

  const stocks: [string, number][] = [];
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("stock_")) continue;
    const vid = z.string().uuid().safeParse(k.slice(6));
    const n = Number(v);
    if (!vid.success || !Number.isInteger(n) || n < 0 || n > 100000) return back("error=stock");
    stocks.push([vid.data, n]);
  }

  const res = await resolveArabic([
    { en: nameEn, ar: str(fd, "name_ar", 200), force: retranslate },
    { en: descEn, ar: str(fd, "description_ar", 5000), force: retranslate },
  ]);
  if (!res.ok) return back(`error=${res.error}`);
  const [nameAr, descAr] = res.ar;
  if (!nameAr) return back("error=fields");

  await sql.begin(async (tx) => {
    await tx`update products set name_ar = ${nameAr}, name_en = ${nameEn || null}, description_ar = ${descAr},
      description_en = ${descEn || null}, status = ${status.data}, price_minor = ${price}, sale_price_minor = ${sale},
      is_featured = ${fd.get("is_featured") === "on"}, updated_at = now() where id = ${id}`;
    for (const [vid, n] of stocks) {
      await tx`update product_variants set stock = ${n} where id = ${vid} and product_id = ${id}`;
    }
  });
  await audit(admin.id, "product.update", { id, status: status.data, price, sale, retranslate });
  return back("saved=1");
}

export async function setProductCategories(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().parse(fd.get("id"));
  const cats = fd.getAll("cat").map(String).filter((c) => z.string().uuid().safeParse(c).success);
  await sql.begin(async (tx) => {
    await tx`delete from product_categories where product_id = ${id}`;
    for (const c of cats) {
      await tx`insert into product_categories (product_id, category_id) values (${id}, ${c}) on conflict do nothing`;
    }
  });
  await audit(admin.id, "product.categories", { id, count: cats.length });
  redirect(`/admin/products/${id}/organize?saved=1`);
}

export async function addVariant(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().parse(fd.get("id"));
  const back = (q: string): never => redirect(`/admin/products/${id}/organize?${q}`);
  const size = str(fd, "size", 40);
  const colorEn = str(fd, "color_en", 40);
  const colorArIn = str(fd, "color_ar", 40);
  const stock = Number(String(fd.get("stock") ?? "0").trim() || "0");
  if (!size && !colorEn && !colorArIn) return back("error=variant");
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) return back("error=stock");
  const res = await resolveArabic([{ en: colorEn, ar: colorArIn }]);
  if (!res.ok) return back(`error=${res.error}`);
  const [p] = await sql<{ sku: string }[]>`select sku from products where id = ${id}`;
  if (!p) return back("error=variant");
  const vsku = `${p.sku}-${randomBytes(3).toString("hex")}`;
  await sql`insert into product_variants (product_id, sku, size, color_ar, color_en, stock)
            values (${id}, ${vsku}, ${size || null}, ${res.ar[0] || null}, ${colorEn || null}, ${stock})`;
  await audit(admin.id, "variant.add", { id, sku: vsku });
  return back("saved=1");
}

export async function createCategory(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const slug = z.string().trim().max(60).regex(SLUG).safeParse(fd.get("slug"));
  const nameEn = str(fd, "name_en", 80);
  const sort = z.coerce.number().int().min(0).max(9999).safeParse(fd.get("sort_order") || "0");
  if (!slug.success || !nameEn || !sort.success) return redirect("/admin/categories?error=fields");
  const res = await resolveArabic([{ en: nameEn, ar: str(fd, "name_ar", 80) }]);
  if (!res.ok) return redirect(`/admin/categories?error=${res.error}`);
  if (!res.ar[0]) return redirect("/admin/categories?error=fields");
  try {
    await sql`insert into categories (slug, name_ar, name_en, sort_order, is_active)
              values (${slug.data}, ${res.ar[0]}, ${nameEn}, ${sort.data}, true)`;
  } catch (e) {
    if (isDup(e)) return redirect("/admin/categories?error=duplicate");
    throw e;
  }
  await audit(admin.id, "category.create", { slug: slug.data });
  redirect("/admin/categories?saved=1");
}

export async function updateCategory(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().safeParse(fd.get("id"));
  const nameEn = str(fd, "name_en", 80);
  const sort = z.coerce.number().int().min(0).max(9999).safeParse(fd.get("sort_order") || "0");
  if (!id.success || !sort.success) return redirect("/admin/categories?error=fields");
  const res = await resolveArabic([{ en: nameEn, ar: str(fd, "name_ar", 80), force: fd.get("retranslate") === "on" }]);
  if (!res.ok) return redirect(`/admin/categories?error=${res.error}`);
  if (!res.ar[0]) return redirect("/admin/categories?error=fields");
  const active = fd.get("is_active") === "on";
  await sql`update categories set name_ar = ${res.ar[0]}, name_en = ${nameEn || null}, sort_order = ${sort.data}, is_active = ${active}
            where id = ${id.data}`;
  await audit(admin.id, "category.update", { id: id.data, active });
  redirect("/admin/categories?saved=1");
}
