"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth";
import { parseDiscount, parseRate } from "@/lib/admin-forms";

const MANAGERS: ("owner" | "manager")[] = ["owner", "manager"];
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "");

// ---- Reviews -------------------------------------------------------------
export async function moderateReview(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().parse(fd.get("id"));
  const decision = z.enum(["approve", "reject", "delete"]).parse(fd.get("decision"));
  const tab = z.enum(["pending", "approved", "rejected"]).catch("pending").parse(fd.get("tab"));
  if (decision === "delete") await sql`delete from reviews where id = ${id}`;
  else await sql`update reviews set status = ${decision === "approve" ? "approved" : "rejected"} where id = ${id}`;
  await audit(admin.id, `review.${decision}`, { id });
  redirect(`/admin/reviews?tab=${tab}&saved=1`);
}

// ---- Discounts -----------------------------------------------------------
export async function createDiscount(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const r = parseDiscount({
    code: str(fd, "code"), kind: str(fd, "kind"), value: str(fd, "value"), min_order: str(fd, "min_order"),
    max_uses: str(fd, "max_uses"), starts: str(fd, "starts"), ends: str(fd, "ends"),
  });
  if (!r.ok) redirect(`/admin/discounts?error=${r.error}`);
  const d = r.d;
  try {
    await sql`insert into discounts (code, kind, value, min_order_minor, max_uses, starts_at, ends_at)
      values (${d.code}, ${d.kind}, ${d.value}, ${d.min_order_minor}, ${d.max_uses}, ${d.starts_at}, ${d.ends_at})`;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") redirect("/admin/discounts?error=duplicate");
    throw e;
  }
  await audit(admin.id, "discount.create", { code: d.code, kind: d.kind, value: d.value });
  redirect("/admin/discounts?saved=1");
}

export async function toggleDiscount(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().parse(fd.get("id"));
  const [row] = await sql<{ code: string; is_active: boolean }[]>`
    update discounts set is_active = not is_active where id = ${id} returning code, is_active`;
  if (row) await audit(admin.id, "discount.toggle", { code: row.code, active: row.is_active });
  redirect("/admin/discounts?saved=1");
}

export async function deleteDiscount(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().parse(fd.get("id"));
  try {
    const rows = await sql`delete from discounts where id = ${id} and used_count = 0 returning code`;
    if (rows.length === 0) redirect("/admin/discounts?error=used");
    await audit(admin.id, "discount.delete", { code: rows[0].code });
  } catch (e) {
    if ((e as { code?: string }).code === "23503") redirect("/admin/discounts?error=used");
    throw e;
  }
  redirect("/admin/discounts?saved=1");
}

// ---- Currencies ----------------------------------------------------------
export async function updateCurrency(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const code = z.string().regex(/^[A-Z]{3}$/).parse(fd.get("code"));
  const back = (q: string): never => redirect(`/admin/currencies?${q}&c=${code}`);
  if (code === "BHD") back("error=base");
  const active = fd.get("is_active") === "on";
  const rateRaw = str(fd, "rate").trim();
  const rate = rateRaw === "" ? null : parseRate(rateRaw);
  if (rateRaw !== "" && rate === null) back("error=rate");
  if (active && rate === null) back("error=needrate");
  await sql`update currencies set
      is_active = ${active},
      rate_updated_at = case when rate_to_base is distinct from ${rate}::numeric then now() else rate_updated_at end,
      rate_source = case when rate_to_base is distinct from ${rate}::numeric then 'manual' else rate_source end,
      rate_to_base = ${rate}::numeric
    where code = ${code}`;
  await audit(admin.id, "currency.update", { code, active, rate });
  back("saved=1");
}

// ---- Live exchange rates ----------------------------------------------------
import { parseRates } from "@/lib/rates";

export async function refreshRates() {
  const admin = await requireAdmin(MANAGERS);
  let json: unknown = null;
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/BHD", { signal: AbortSignal.timeout(15000) });
    if (r.ok) json = await r.json();
  } catch { /* handled below */ }
  const active = await sql<{ code: string }[]>`select code from currencies where is_active and code <> 'BHD'`;
  const rates = parseRates(json, active.map((c) => c.code));
  const codes = Object.keys(rates);
  if (codes.length === 0) redirect("/admin/currencies?error=ratesfail&c=rates");
  for (const code of codes) {
    await sql`update currencies set rate_to_base = ${rates[code]}::numeric, rate_updated_at = now(), rate_source = 'open.er-api.com' where code = ${code}`;
  }
  await audit(admin.id, "currency.refresh", { updated: codes });
  redirect("/admin/currencies?saved=1&c=rates");
}
