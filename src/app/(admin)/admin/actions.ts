"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { audit, clientIp, createSession, destroySession, getAdmin, requireAdmin, verifyPassword } from "@/lib/auth";

const DUMMY_HASH = "scrypt$" + "00".repeat(16) + "$" + "00".repeat(64);

export async function login(_prev: { error?: string } | undefined, fd: FormData) {
  const parsed = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) })
    .safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const email = parsed.data.email.toLowerCase();
  const ip = await clientIp();
  const [f] = await sql<{ n: string }[]>`
    select count(*) as n from login_attempts
    where ok = false and at > now() - interval '15 minutes' and (email = ${email} or ip = ${ip})`;
  if (Number(f.n) >= 5) return { error: "Too many failed attempts. Try again in 15 minutes." };

  const [u] = await sql<{ id: string; password_hash: string }[]>`
    select id, password_hash from admin_users where email = ${email}`;
  const ok = await verifyPassword(parsed.data.password, u?.password_hash ?? DUMMY_HASH);
  const success = Boolean(u && ok);
  await sql`insert into login_attempts (email, ip, ok) values (${email}, ${ip}, ${success})`;
  if (!success) return { error: "Incorrect email or password." };

  await createSession(u.id);
  await audit(u.id, "login");
  redirect("/admin");
}

export async function logout() {
  const a = await getAdmin();
  await destroySession();
  if (a) await audit(a.id, "logout");
  redirect("/admin/login");
}

// "12.500" -> 12500 fils. Strings only, never floats.
function toMinor(s: string): number | null {
  const m = /^(\d{1,7})(?:\.(\d{1,3}))?$/.exec(s.trim());
  if (!m) return null;
  return Number(m[1]) * 1000 + Number((m[2] ?? "").padEnd(3, "0"));
}

export async function updateProduct(fd: FormData) {
  const admin = await requireAdmin(["owner", "manager"]);
  const id = z.string().uuid().parse(fd.get("id"));
  const back = (q: string) => redirect(`/admin/products/${id}?${q}`);

  const name = z.string().trim().min(1).max(200).safeParse(fd.get("name_ar"));
  const desc = z.string().max(5000).safeParse(fd.get("description_ar") ?? "");
  const status = z.enum(["draft", "published", "archived"]).safeParse(fd.get("status"));
  if (!name.success || !desc.success || !status.success) back("error=fields");

  const price = toMinor(String(fd.get("price") ?? ""));
  const saleRaw = String(fd.get("sale_price") ?? "").trim();
  const sale = saleRaw === "" ? null : toMinor(saleRaw);
  if (price === null || price <= 0 || (saleRaw !== "" && (sale === null || sale >= price))) back("error=price");

  const stocks: [string, number][] = [];
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("stock_")) continue;
    const vid = z.string().uuid().safeParse(k.slice(6));
    const n = Number(v);
    if (!vid.success || !Number.isInteger(n) || n < 0 || n > 100000) back("error=stock");
    else stocks.push([vid.data, n]);
  }

  await sql.begin(async (tx) => {
    await tx`update products set name_ar = ${name.data!}, description_ar = ${desc.data!},
      status = ${status.data!}, price_minor = ${price!}, sale_price_minor = ${sale},
      is_featured = ${fd.get("is_featured") === "on"}, updated_at = now() where id = ${id}`;
    for (const [vid, n] of stocks) {
      await tx`update product_variants set stock = ${n} where id = ${vid} and product_id = ${id}`;
    }
  });
  await audit(admin.id, "product.update", { id, status: status.data!, price, sale });
  back("saved=1");
}
