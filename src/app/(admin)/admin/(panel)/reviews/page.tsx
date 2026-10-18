import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { moderateReview } from "@/app/(admin)/admin/ops-actions";

const TABS = ["pending", "approved", "rejected"] as const;

export default async function Reviews({ searchParams }: { searchParams: Promise<{ tab?: string; saved?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const q = await searchParams;
  const tab = (TABS as readonly string[]).includes(q.tab ?? "") ? (q.tab as (typeof TABS)[number]) : "pending";
  const counts = await sql<{ status: string; n: string }[]>`select status, count(*) as n from reviews group by status`;
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? "0";
  const rows = await sql<{ id: string; author_name: string; rating: number; body: string; created_at: Date;
    product: string; ref: string }[]>`
    select r.id, r.author_name, r.rating, r.body, r.created_at, p.name_ar as product, o.ref
    from reviews r join products p on p.id = r.product_id join orders o on o.id = r.order_id
    where r.status = ${tab} order by r.created_at desc limit 100`;
  const btn = "rounded-xl px-4 py-2 text-sm font-semibold transition-colors";

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Moderation</p>
        <h1 className="text-3xl font-semibold mt-1">Reviews</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl">Reviews appear on the storefront only after you approve them. Each review comes from a customer who entered a valid order reference.</p>
      </div>
      {q.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved.</p>}
      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/reviews?tab=${t}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${t === tab ? "bg-[#0c0a09] text-[#c9a96e]" : "bg-white border border-neutral-200 hover:border-[#c9a96e]"}`}>
            {t} ({n(t)})
          </Link>
        ))}
      </div>
      {rows.length === 0 && <p className="text-sm text-neutral-500">Nothing here.</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="a-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold" dir="auto">{r.author_name} <span className="text-amber-500 ml-2">{"★".repeat(r.rating)}<span className="text-neutral-300">{"★".repeat(5 - r.rating)}</span></span></p>
              <p className="text-xs text-neutral-500">{r.created_at.toISOString().slice(0, 10)} · order LU-{r.ref.slice(0, 4)}-{r.ref.slice(4, 8)}-{r.ref.slice(8)}</p>
            </div>
            <p className="mt-1 text-sm text-neutral-500" dir="rtl">{r.product}</p>
            {r.body && <p className="mt-3 text-sm leading-7" dir="auto">{r.body}</p>}
            <form action={moderateReview} className="mt-4 flex flex-wrap gap-2">
              <input type="hidden" name="id" value={r.id} /><input type="hidden" name="tab" value={tab} />
              {tab !== "approved" && <button name="decision" value="approve" className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>Approve</button>}
              {tab !== "rejected" && <button name="decision" value="reject" className={`${btn} border border-neutral-300 hover:border-red-600 hover:text-red-700`}>Reject</button>}
              <button name="decision" value="delete" className={`${btn} text-red-700 hover:bg-red-50`}>Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
