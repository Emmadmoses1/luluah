import { sql } from "@/lib/db";
import { getAccount } from "@/lib/account-auth";
import { toCsv } from "@/lib/admin-forms";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await getAccount();
  if (!a) return new Response("unauthorized", { status: 401 });
  const rows = await sql<{ created_at: Date; kind: string; amount_minor: string; balance_after_minor: string; note: string | null }[]>`
    select created_at, kind, amount_minor, balance_after_minor, note from wallet_transactions
    where account_id = ${a.id} order by created_at, id limit 5000`;
  const csv = toCsv([["date_utc", "type", "amount_bhd", "balance_after_bhd", "note"],
    ...rows.map((r) => [r.created_at, r.kind, (Number(r.amount_minor) / 1000).toFixed(3), (Number(r.balance_after_minor) / 1000).toFixed(3), r.note])]);
  return new Response("\uFEFF" + csv, { headers: {
    "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="wallet-statement.csv"', "Cache-Control": "no-store",
  } });
}
