"use server";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth";
import { parseBhd } from "@/lib/money";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isDup = (e: unknown) => (e as { code?: string })?.code === "23505";
const MANAGERS: ("owner" | "manager")[] = ["owner", "manager"];

export async function createProduct(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const back = (q: string): never => redirect(`/admin/products/new?${q}`);

  const name = z.string().trim().min(1).max(200).safeParse(fd.get("name_ar"));
  const desc = z.string().max(5000).safeParse(fd.get("description_ar") ?? "");
  const slug = z.string().trim().max(80).regex(SLUG).safeParse(fd.get("slug"));
  const sku = z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/).safeParse(fd.get("sku"));
  const status = z.enum(["draft", "published"]).safeParse(fd.get("status"));
  if (!name.success || !desc.success || !slug.success || !sku.success || !status.success) back("error=fields");

  const price = parseBhd(String(fd.get("price") ?? ""));
  const saleRaw = String(fd.get("sale_price") ?? "").trim();
  const sale = saleRaw === "" ? null : parseBhd(saleRaw);
  if (price === null || price <= 0 || (saleRaw !== "" && (sale === null || sale >= price))) back("error=price");

  const variants: { size: string | null; color: string | null; stock: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const size = String(fd.get(`size_${i}`) ?? "").trim().slice(0, 40);
    const color = String(fd.get(`color_${i}`) ?? "").trim().slice(0, 40);
    if (!size && !color) continue;
    const stock = Number(String(fd.get(`stock_${i}`) ?? "0").trim() || "0");
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) back("error=stock");
    variants.push({ size: size || null, color: color || null, stock });
  }
  if (variants.length === 0) back("error=variant");

  const cats = fd.getAll("cat").map(String).filter((c) => z.string().uuid().safeParse(c).success);

  let id = "";
  try {
    id = await sql.begin(async (tx) => {
      const [p] = await tx<{ id: string }[]>`
        insert into products (slug, sku, name_ar, description_ar, price_minor, sale_price_minor, status, is_featured)
        values (${slug.data!}, ${sku.data!}, ${name.data!}, ${desc.data!}, ${price!}, ${sale},
                ${status.data!}, ${fd.get("is_featured") === "on"}) returning id`;
      for (const [i, v] of variants.entries()) {
        await tx`insert into product_variants (product_id, sku, size, color_ar, stock)
                 values (${p.id}, ${sku.data! + "-" + (i + 1)}, ${v.size}, ${v.color}, ${v.stock})`;
      }
      for (const c of cats) {
        await tx`insert into product_categories (product_id, category_id) values (${p.id}, ${c}) on conflict do nothing`;
      }
      return p.id;
    });
  } catch (e) {
    if (isDup(e)) back("error=duplicate");
    throw e;
  }
  await audit(admin.id, "product.create", { id, sku: sku.data!, status: status.data! });
  redirect(`/admin/products/${id}?saved=1`);
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
  const size = String(fd.get("size") ?? "").trim().slice(0, 40);
  const color = String(fd.get("color") ?? "").trim().slice(0, 40);
  const stock = Number(String(fd.get("stock") ?? "0").trim() || "0");
  if (!size && !color) back("error=variant");
  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) back("error=stock");
  const [p] = await sql<{ sku: string }[]>`select sku from products where id = ${id}`;
  if (!p) back("error=variant");
  const vsku = `${p.sku}-${randomBytes(3).toString("hex")}`;
  await sql`insert into product_variants (product_id, sku, size, color_ar, stock)
            values (${id}, ${vsku}, ${size || null}, ${color || null}, ${stock})`;
  await audit(admin.id, "variant.add", { id, sku: vsku });
  back("saved=1");
}

export async function createCategory(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const slug = z.string().trim().max(60).regex(SLUG).safeParse(fd.get("slug"));
  const name = z.string().trim().min(1).max(80).safeParse(fd.get("name_ar"));
  const sort = z.coerce.number().int().min(0).max(9999).safeParse(fd.get("sort_order") || "0");
  if (!slug.success || !name.success || !sort.success) redirect("/admin/categories?error=fields");
  try {
    await sql`insert into categories (slug, name_ar, sort_order, is_active)
              values (${slug.data}, ${name.data}, ${sort.data}, true)`;
  } catch (e) {
    if (isDup(e)) redirect("/admin/categories?error=duplicate");
    throw e;
  }
  await audit(admin.id, "category.create", { slug: slug.data });
  redirect("/admin/categories?saved=1");
}

export async function updateCategory(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().safeParse(fd.get("id"));
  const name = z.string().trim().min(1).max(80).safeParse(fd.get("name_ar"));
  const sort = z.coerce.number().int().min(0).max(9999).safeParse(fd.get("sort_order") || "0");
  if (!id.success || !name.success || !sort.success) redirect("/admin/categories?error=fields");
  const active = fd.get("is_active") === "on";
  await sql`update categories set name_ar = ${name.data}, sort_order = ${sort.data}, is_active = ${active}
            where id = ${id.data}`;
  await audit(admin.id, "category.update", { id: id.data, active });
  redirect("/admin/categories?saved=1");
}
