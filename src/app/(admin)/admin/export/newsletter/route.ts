import { sql } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth";
import { toCsv } from "@/lib/admin-forms";

export async function GET() {
  const admin = await requireAdmin(["owner", "manager"]);
  const rows = await sql<{ email: string; created_at: Date }[]>`
    select email, created_at from newsletter_subscribers order by created_at limit 50000`;
  await audit(admin.id, "newsletter.export", { rows: rows.length });
  const csv = toCsv([["email", "subscribed_at_utc"], ...rows.map((r) => [r.email, r.created_at])]);
  return new Response("\uFEFF" + csv, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="newsletter-subscribers.csv"',
    "Cache-Control": "no-store",
  } });
}
