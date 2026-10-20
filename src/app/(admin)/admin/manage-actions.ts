"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { audit, hashPassword, requireAdmin } from "@/lib/auth";
import { parseAdminUser, parseDelta } from "@/lib/admin-forms";
import { sniffImage } from "@/lib/image-sniff";

const MANAGERS: ("owner" | "manager")[] = ["owner", "manager"];
const MAX_IMAGE = 4 * 1024 * 1024;
const MAX_IMAGES = 12;
const uuid = z.string().uuid();
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

// ---- Product images ------------------------------------------------------
export async function uploadProductImage(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = uuid.parse(fd.get("id"));
  const back = (q: string): never => redirect(`/admin/products/${id}/images?${q}`);
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return back("error=file");
  if (file.size > MAX_IMAGE) return back("error=size");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return back("error=type");
  const [p] = await sql<{ name_ar: string }[]>`select name_ar from products where id = ${id}`;
  if (!p) return back("error=missing");
  const [c] = await sql<{ n: string; c: string }[]>`
    select coalesce(max(sort_order), -1) + 1 as n, count(*) as c from product_images where product_id = ${id}`;
  if (Number(c.c) >= MAX_IMAGES) return back("error=limit");
  const alt = str(fd, "alt").trim().slice(0, 200) || p.name_ar;
  await sql.begin(async (tx) => {
    const [m] = await tx<{ id: string }[]>`insert into media (mime, size, data) values (${mime}, ${bytes.length}, ${Buffer.from(bytes)}) returning id`;
    await tx`insert into product_images (product_id, path, alt_ar, sort_order, source_name, license_note)
      values (${id}, ${"/media/" + m.id}, ${alt}, ${Number(c.n)}, 'Uploaded by store admin', 'Own image')`;
  });
  await audit(admin.id, "product.image.upload", { id, mime, size: bytes.length });
  return back("saved=1");
}

export async function moveProductImage(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = uuid.parse(fd.get("id"));
  const imageId = uuid.parse(fd.get("image"));
  const dir = z.enum(["up", "down"]).parse(fd.get("dir"));
  await sql.begin(async (tx) => {
    const rows = await tx<{ id: string }[]>`select id from product_images where product_id = ${id} order by sort_order, id`;
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(imageId);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    for (let k = 0; k < ids.length; k++) await tx`update product_images set sort_order = ${k} where id = ${ids[k]}`;
  });
  await audit(admin.id, "product.image.move", { id, imageId, dir });
  redirect(`/admin/products/${id}/images?saved=1`);
}

export async function deleteProductImage(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = uuid.parse(fd.get("id"));
  const imageId = uuid.parse(fd.get("image"));
  await sql.begin(async (tx) => {
    const [row] = await tx<{ path: string }[]>`delete from product_images where id = ${imageId} and product_id = ${id} returning path`;
    const m = /^\/media\/([0-9a-f-]{36})$/.exec(row?.path ?? "");
    if (m) await tx`delete from media where id = ${m[1]}`;
  });
  await audit(admin.id, "product.image.delete", { id, imageId });
  redirect(`/admin/products/${id}/images?saved=1`);
}

// ---- Inventory -----------------------------------------------------------
export async function adjustStock(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = uuid.parse(fd.get("id"));
  const low = fd.get("low") === "1" ? "&low=1" : "";
  const delta = parseDelta(str(fd, "delta"));
  if (delta === null) redirect(`/admin/inventory?error=delta&v=${id}${low}`);
  const reason = str(fd, "reason").trim().slice(0, 200);
  const rows = await sql<{ sku: string; stock: number }[]>`
    update product_variants set stock = stock + ${delta as number}
    where id = ${id} and stock + ${delta as number} >= 0 and stock + ${delta as number} <= 1000000
    returning sku, stock`;
  if (rows.length === 0) redirect(`/admin/inventory?error=range&v=${id}${low}`);
  await audit(admin.id, "stock.adjust", { id, sku: rows[0].sku, delta, newStock: rows[0].stock, reason });
  redirect(`/admin/inventory?saved=1&v=${id}${low}`);
}

// ---- Admin users (owner only) -------------------------------------------
const OWNER: "owner"[] = ["owner"];

export async function createAdminUser(fd: FormData) {
  const admin = await requireAdmin(OWNER);
  const r = parseAdminUser({ email: str(fd, "email"), role: str(fd, "role"), password: str(fd, "password") });
  if (!r.ok) redirect(`/admin/users?error=${r.error}`);
  const v = r as Extract<typeof r, { ok: true }>;
  const hash = await hashPassword(v.password);
  try {
    await sql`insert into admin_users (email, password_hash, role, must_change_password) values (${v.email}, ${hash}, ${v.role}, true)`;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") redirect("/admin/users?error=exists");
    throw e;
  }
  await audit(admin.id, "user.create", { email: v.email, role: v.role });
  redirect("/admin/users?saved=1");
}

async function otherOwners(excludeId: string) {
  const [o] = await sql<{ n: string }[]>`select count(*) as n from admin_users where role = 'owner' and id <> ${excludeId}`;
  return Number(o.n);
}

export async function setAdminRole(fd: FormData) {
  const admin = await requireAdmin(OWNER);
  const id = uuid.parse(fd.get("id"));
  const role = z.enum(["owner", "manager", "staff"]).parse(fd.get("role"));
  if (id === admin.id && role !== "owner") redirect("/admin/users?error=self");
  const [t] = await sql<{ role: string }[]>`select role from admin_users where id = ${id}`;
  if (t?.role === "owner" && role !== "owner" && (await otherOwners(id)) === 0) redirect("/admin/users?error=lastowner");
  await sql`update admin_users set role = ${role} where id = ${id}`;
  await audit(admin.id, "user.role", { id, role });
  redirect("/admin/users?saved=1");
}

export async function resetAdminPassword(fd: FormData) {
  const admin = await requireAdmin(OWNER);
  const id = uuid.parse(fd.get("id"));
  const pw = str(fd, "password");
  if (pw.length < 12 || pw.length > 200) redirect("/admin/users?error=password");
  const hash = await hashPassword(pw);
  await sql`update admin_users set password_hash = ${hash}, must_change_password = true where id = ${id}`;
  await sql`delete from admin_sessions where admin_id = ${id}`;
  await audit(admin.id, "user.password_reset", { id });
  redirect("/admin/users?saved=1");
}

export async function deleteAdminUser(fd: FormData) {
  const admin = await requireAdmin(OWNER);
  const id = uuid.parse(fd.get("id"));
  if (id === admin.id) redirect("/admin/users?error=self");
  const [t] = await sql<{ role: string; email: string }[]>`select role, email from admin_users where id = ${id}`;
  if (!t) redirect("/admin/users");
  if (t.role === "owner" && (await otherOwners(id)) === 0) redirect("/admin/users?error=lastowner");
  await sql`delete from admin_users where id = ${id}`;
  await audit(admin.id, "user.delete", { email: t.email });
  redirect("/admin/users?saved=1");
}

// ---- Payment display settings & newsletter -------------------------------
import { getSettings, saveSetting } from "@/lib/settings";

export async function savePaymentSettings(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const hours = Number(str(fd, "order_expiry_hours").trim());
  if (!Number.isInteger(hours) || hours < 1 || hours > 168) redirect("/admin/payments?error=hours");
  const { payments } = await getSettings();
  const next = {
    ...payments, crypto_enabled: fd.get("crypto_enabled") === "on",
    order_expiry_hours: hours, instructions_ar: str(fd, "instructions_ar").trim().slice(0, 1000),
  };
  await saveSetting("payments", next);
  await audit(admin.id, "settings.payments.update", { crypto_enabled: next.crypto_enabled, order_expiry_hours: hours });
  redirect("/admin/payments?saved=1");
}

export async function removeSubscriber(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = uuid.parse(fd.get("id"));
  await sql`delete from newsletter_subscribers where id = ${id}`;
  await audit(admin.id, "newsletter.remove", { id });
  redirect("/admin/newsletter?saved=1");
}

// ---- Multiple image upload & 360° flag ------------------------------------
const MAX_IMAGES_TOTAL = 36;

export async function uploadProductImages(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = uuid.parse(fd.get("id"));
  const back = (q: string): never => redirect(`/admin/products/${id}/images?${q}`);
  const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return back("error=file");
  const [p] = await sql<{ name_ar: string }[]>`select name_ar from products where id = ${id}`;
  if (!p) return back("error=missing");
  const [c] = await sql<{ n: string; c: string }[]>`
    select coalesce(max(sort_order), -1) + 1 as n, count(*) as c from product_images where product_id = ${id}`;
  const room = MAX_IMAGES_TOTAL - Number(c.c);
  if (room <= 0) return back("error=limit");
  const alt = str(fd, "alt").trim().slice(0, 200) || p.name_ar;
  let ok = 0, skipped = 0;
  await sql.begin(async (tx) => {
    let next = Number(c.n);
    for (const file of files) {
      if (ok >= room || file.size > MAX_IMAGE) { skipped++; continue; }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = sniffImage(bytes);
      if (!mime) { skipped++; continue; }
      const [m] = await tx<{ id: string }[]>`insert into media (mime, size, data) values (${mime}, ${bytes.length}, ${Buffer.from(bytes)}) returning id`;
      await tx`insert into product_images (product_id, path, alt_ar, sort_order, source_name, license_note)
        values (${id}, ${"/media/" + m.id}, ${alt}, ${next++}, 'Uploaded by store admin', 'Own image')`;
      ok++;
    }
  });
  await audit(admin.id, "product.image.upload", { id, added: ok, skipped });
  return back(`saved=1&added=${ok}&skipped=${skipped}`);
}

export async function setSpin360(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = uuid.parse(fd.get("id"));
  const on = fd.get("spin") === "on";
  await sql`update products set spin_360 = ${on} where id = ${id}`;
  await audit(admin.id, "product.spin360", { id, on });
  redirect(`/admin/products/${id}/images?saved=1`);
}

// ---- Postal codes admin ------------------------------------------------------
import { parsePostalCsv } from "@/lib/postal-csv";

export async function savePostalFormat(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const iso = z.string().regex(/^[A-Z]{2}$/).parse(fd.get("iso2"));
  const regex = str(fd, "postal_regex").trim();
  const hint = str(fd, "postal_hint").trim().slice(0, 60);
  if (regex) {
    if (regex.length > 80 || !regex.startsWith("^") || !regex.endsWith("$")) redirect(`/admin/postal?error=regex&c=${iso}`);
    try { new RegExp(regex); } catch { redirect(`/admin/postal?error=regex&c=${iso}`); }
  }
  await sql`update countries set postal_regex = ${regex || null}, postal_hint = ${hint || null} where iso2 = ${iso}`;
  await audit(admin.id, "postal.format", { iso, regex, hint });
  redirect(`/admin/postal?saved=1&c=${iso}`);
}

export async function importPostalCsv(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return redirect("/admin/postal?error=file");
  if (file.size > 3 * 1024 * 1024) return redirect("/admin/postal?error=size");
  const countries = await sql<{ iso2: string; postal_regex: string | null }[]>`select iso2, postal_regex from countries`;
  const r = parsePostalCsv(
    await file.text(),
    new Set(countries.map((c) => c.iso2)),
    new Map(countries.filter((c) => c.postal_regex).map((c): [string, string] => [c.iso2, c.postal_regex as string])),
  );
  if (r.error) return redirect("/admin/postal?error=header");
  for (let i = 0; i < r.rows.length; i += 1000) {
    await sql`insert into postal_codes ${sql(r.rows.slice(i, i + 1000), "country_iso2", "code", "place_name", "admin_name")}
      on conflict (country_iso2, code, place_name) do nothing`;
  }
  await audit(admin.id, "postal.import", { rows: r.rows.length, rejected: r.rejected.length });
  redirect(`/admin/postal?imported=${r.rows.length}&rejected=${r.rejected.length}`);
}
