import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { importPostalCsv, savePostalFormat } from "@/app/(admin)/admin/manage-actions";

const MSG: Record<string, string> = {
  regex: "A format must start with ^ and end with $, be under 80 characters, and be a valid pattern. Example: ^[0-9]{5}$",
  file: "Choose a CSV file.", size: "The file is larger than 3 MB. Split it into smaller files.",
  header: "The first row must be: country,code,place_name,admin_name (the last column is optional).",
};

export default async function Postal({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; c?: string; imported?: string; rejected?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const q = await searchParams;
  const rows = await sql<{ iso2: string; name_en: string; delivery_enabled: boolean; postal_regex: string | null; postal_hint: string | null; n: string }[]>`
    select k.iso2, k.name_en, k.delivery_enabled, k.postal_regex, k.postal_hint, count(p.id) as n
    from countries k left join postal_codes p on p.country_iso2 = k.iso2
    group by k.iso2 order by k.delivery_enabled desc, k.sort_order`;
  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Delivery</p>
        <h1 className="text-3xl font-semibold mt-1">Postal codes</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-3xl">
          Customers can always type their own postal code, so a missing list never blocks an order. If you add a format for a country, typed codes must match it.
          The lookup lists are partial and come from open data. For complete lists, get the official file from the country&apos;s postal operator and import it below.
        </p>
      </div>
      {q.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved{q.c ? ` (${q.c})` : ""}.</p>}
      {q.imported && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Imported {q.imported} postal codes. {Number(q.rejected) > 0 ? `${q.rejected} rows were rejected (wrong format, unknown country or missing data).` : ""}</p>}
      {q.error && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{q.c ? `${q.c}: ` : ""}{MSG[q.error] ?? "Could not save."}</p>}

      <form action={importPostalCsv} className="a-card p-5 mb-6 flex flex-wrap items-end gap-4">
        <label className="a-label flex-1 min-w-[16rem]">Import postal codes (CSV, up to 3 MB)
          <input type="file" name="file" accept=".csv,text/csv" required className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" />
        </label>
        <button className="a-btn">Import</button>
        <p className="w-full text-xs text-neutral-500">First row: <span className="font-mono">country,code,place_name,admin_name</span>. Country is the two-letter code (SA, EG…). Rows that do not match a country&apos;s saved format are rejected.</p>
      </form>

      <div className="space-y-3">
        {rows.map((c) => (
          <form key={c.iso2} action={savePostalFormat} className="a-card p-4 grid gap-3 md:grid-cols-[14rem_1fr_1fr_auto] items-end">
            <input type="hidden" name="iso2" value={c.iso2} />
            <div>
              <p className="font-semibold">{c.name_en} <span className="text-neutral-400 text-xs font-normal">{c.iso2}</span></p>
              <p className="text-xs text-neutral-500">{Number(c.n).toLocaleString("en")} codes loaded{c.delivery_enabled ? "" : " · delivery off"}</p>
            </div>
            <label className="a-label">Format (pattern)
              <input name="postal_regex" defaultValue={c.postal_regex ?? ""} placeholder="^[0-9]{5}$" dir="ltr" className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900 font-mono" />
            </label>
            <label className="a-label">Hint shown to customers (Arabic)
              <input name="postal_hint" defaultValue={c.postal_hint ?? ""} dir="rtl" maxLength={60} className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" />
            </label>
            <button className="a-btn">Save</button>
          </form>
        ))}
      </div>
    </>
  );
}
