"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth";
import { parseBhd } from "@/lib/money";

const MANAGERS: ("owner" | "manager")[] = ["owner", "manager"];

export async function updateCountry(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const iso = z.string().regex(/^[A-Z]{2}$/).parse(fd.get("iso2"));
  const back = (q: string): never => redirect(`/admin/shipping?${q}#${iso}`);
  const enabled = fd.get("delivery_enabled") === "on";

  const feeRaw = String(fd.get("fee") ?? "").trim();
  const freeRaw = String(fd.get("free_over") ?? "").trim();
  const minRaw = String(fd.get("min_order") ?? "").trim();
  const fee = feeRaw === "" ? null : parseBhd(feeRaw);
  const free = freeRaw === "" ? null : parseBhd(freeRaw);
  const min = minRaw === "" ? 0 : parseBhd(minRaw);
  if ((feeRaw !== "" && fee === null) || (freeRaw !== "" && free === null) || min === null) back(`error=money&c=${iso}`);

  const etaMinRaw = String(fd.get("eta_min") ?? "").trim();
  const etaMaxRaw = String(fd.get("eta_max") ?? "").trim();
  const etaMin = etaMinRaw === "" ? null : Number(etaMinRaw);
  const etaMax = etaMaxRaw === "" ? null : Number(etaMaxRaw);
  const okEta = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0 && n <= 90);
  if (!okEta(etaMin) || !okEta(etaMax) || (etaMin !== null && etaMax !== null && etaMin > etaMax)) back(`error=eta&c=${iso}`);

  if (enabled && (fee === null || etaMin === null || etaMax === null)) back(`error=required&c=${iso}`);

  await sql`update countries set delivery_enabled = ${enabled}, fee_minor = ${fee ?? 0},
    free_over_minor = ${free}, min_order_minor = ${min ?? 0}, eta_min_days = ${etaMin}, eta_max_days = ${etaMax}
    where iso2 = ${iso}`;
  await audit(admin.id, "country.update", { iso, enabled, fee, free, min, etaMin, etaMax });
  back(`saved=1&c=${iso}`);
}

export async function updateOrder(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().parse(fd.get("id"));
  const status = z.enum(["new", "processing", "shipped", "delivered"]).parse(fd.get("fulfillment_status"));
  const tracking = String(fd.get("tracking_ref") ?? "").trim().slice(0, 100) || null;
  const notes = String(fd.get("admin_notes") ?? "").trim().slice(0, 2000) || null;
  const res = await sql`update orders set fulfillment_status = ${status}, tracking_ref = ${tracking},
    admin_notes = ${notes}, updated_at = now() where id = ${id} and fulfillment_status <> 'cancelled' returning id`;
  if (res.length === 0) redirect(`/admin/orders/${id}?error=cancelled`);
  await audit(admin.id, "order.update", { id, status, tracking });
  redirect(`/admin/orders/${id}?saved=1`);
}

export async function cancelOrder(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().parse(fd.get("id"));
  const result = await sql.begin(async (tx) => {
    const [o] = await tx<{ fulfillment_status: string; payment_status: string }[]>`
      select fulfillment_status, payment_status from orders where id = ${id} for update`;
    if (!o) return "missing";
    if (["shipped", "delivered", "cancelled"].includes(o.fulfillment_status)) return "state";
    if (["paid", "confirming"].includes(o.payment_status)) return "paid";
    await tx`update product_variants v set stock = v.stock + i.qty
             from order_items i where i.order_id = ${id} and i.variant_id = v.id`;
    await tx`update orders set fulfillment_status = 'cancelled', updated_at = now() where id = ${id}`;
    return "ok";
  });
  if (result !== "ok") redirect(`/admin/orders/${id}?error=${result}`);
  await audit(admin.id, "order.cancel", { id });
  redirect(`/admin/orders/${id}?saved=1`);
}
