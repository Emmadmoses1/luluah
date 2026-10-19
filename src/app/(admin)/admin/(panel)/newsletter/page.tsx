import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { removeSubscriber } from "@/app/(admin)/admin/manage-actions";

export default async function Newsletter({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const q = await searchParams;
  const [c] = await sql<{ n: string }[]>`select count(*) as n from newsletter_subscribers`;
  const rows = await sql<{ id: string; email: string; created_at: Date }[]>`
    select id, email, created_at from newsletter_subscribers order by created_at desc limit 500`;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Marketing</p>
          <h1 className="text-3xl font-semibold mt-1">Newsletter subscribers <span className="text-lg text-neutral-400">({c.n})</span></h1>
        </div>
        <a href="/admin/export/newsletter" className="a-btn-ghost">Download CSV</a>
      </div>
      {q.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Removed.</p>}
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Email</th><th>Subscribed</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="text-neutral-500">No subscribers yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td dir="ltr" className="break-all">{r.email}</td><td className="whitespace-nowrap">{r.created_at.toISOString().slice(0, 10)}</td>
                <td><form action={removeSubscriber}><input type="hidden" name="id" value={r.id} /><button className="a-btn-ghost !text-red-700">Remove</button></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">Only email addresses people typed into the footer form are listed. This store does not send newsletters by itself: export the list to the email tool you choose.</p>
    </>
  );
}
