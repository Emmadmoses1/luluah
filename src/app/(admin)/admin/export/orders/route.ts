import { sql } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth";
import { parseDateRange, toCsv } from "@/lib/admin-forms";

export async function GET(req: Request) {
  const admin = await requireAdmin(["owner", "manager"]);
  const u = new URL(req.url).searchParams;
  const r = parseDateRange(u.get("from") ?? undefined, u.get("to") ?? undefined);
  if (r.error) return new Response(r.error, { status: 400 });
  const rows = await sql<{ ref: string; created_at: Date; customer_name: string; customer_phone: string; customer_email: string | null;
    country_iso2: string; total_minor: string; currency_code: string; payment_status: string; fulfillment_status: string;
    is_test: boolean; tracking_ref: string | null }[]>`
    select ref, created_at, customer_name, customer_phone, customer_email, country_iso2, total_minor, currency_code,
           payment_status, fulfillment_status, is_test, tracking_ref
    from orders where created_at::date between ${r.from}::date and ${r.to}::date order by created_at limit 5000`;
  await audit(admin.id, "orders.export", { from: r.from, to: r.to, rows: rows.length });
  const csv = toCsv([
    ["reference", "created_at_utc", "customer", "phone", "email", "country", "total", "currency", "payment_status", "fulfillment_status", "test_order", "tracking_ref"],
    ...rows.map((o) => [`LU-${o.ref.slice(0, 4)}-${o.ref.slice(4, 8)}-${o.ref.slice(8)}`, o.created_at, o.customer_name, o.customer_phone,
      o.customer_email, o.country_iso2, (Number(o.total_minor) / 1000).toFixed(3), o.currency_code, o.payment_status, o.fulfillment_status,
      o.is_test ? "yes" : "no", o.tracking_ref]),
  ]);
  return new Response("\uFEFF" + csv, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="orders-${r.from}_to_${r.to}.csv"`,
    "Cache-Control": "no-store",
  } });
}
