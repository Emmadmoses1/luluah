import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { refreshRates, updateCurrency } from "@/app/(admin)/admin/ops-actions";

const MSG: Record<string, string> = {
  base: "BHD is the base currency and cannot be changed.",
  rate: "The rate must be a positive number with up to 8 decimals.",
  needrate: "A currency needs a rate before it can be enabled.",
  ratesfail: "Could not fetch live rates right now. Try again later or enter them by hand.",
};

export default async function Currencies({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; c?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const q = await searchParams;
  const rows = await sql<{ code: string; name_en: string; decimals: number; rate_to_base: string | null; is_active: boolean;
    rate_updated_at: Date | null; rate_source: string | null }[]>`
    select code, name_en, decimals, rate_to_base, is_active, rate_updated_at, rate_source
    from currencies order by (code = 'BHD') desc, is_active desc, code`;
  const trim = (s: string | null) => (s === null ? "" : s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, ""));
  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Pricing</p>
        <h1 className="text-3xl font-semibold mt-1">Currencies</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl">
          Prices are stored in BHD. Other currencies are shown to customers as approximate values using the rate you set here
          (<b>units of the currency per 1 BHD</b>), and payment is always in BHD. Rates are entered by hand: nothing here fetches live rates,
          so update them whenever the market moves. Orders keep the amount they were created with.
        </p>
      </div>
      <form action={refreshRates} className="a-card p-4 mb-4 flex flex-wrap items-center gap-4">
        <button className="a-btn">Refresh rates from the internet</button>
        <p className="text-xs text-neutral-500 max-w-xl">Updates only the currencies that are switched on, using free market rates from <a className="underline" href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">Exchange Rate API</a>. Check the result before relying on it, and edit any rate by hand below.</p>
      </form>
      {q.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved ({q.c}).</p>}
      {q.error && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{q.c}: {MSG[q.error] ?? "Could not save."}</p>}
      <div className="space-y-3">
        {rows.map((c) => (
          <form key={c.code} action={updateCurrency} className={`a-card p-4 grid gap-3 md:grid-cols-5 items-end border-l-4 ${c.is_active ? "border-l-emerald-500" : "border-l-neutral-300"}`}>
            <input type="hidden" name="code" value={c.code} />
            <div className="md:col-span-2">
              <p className="font-semibold">{c.code} <span className="text-neutral-400 font-normal text-sm">{c.name_en}</span></p>
              <p className="text-xs text-neutral-500 mt-1">
                {c.code === "BHD" ? "Base currency" : c.rate_to_base === null ? "No rate set" : `Source: ${c.rate_source ?? "—"}${c.rate_updated_at ? ` · updated ${c.rate_updated_at.toISOString().slice(0, 10)}` : ""}`}
              </p>
            </div>
            <label className="a-label">Rate per 1 BHD
              <input name="rate" inputMode="decimal" defaultValue={trim(c.rate_to_base)} disabled={c.code === "BHD"} className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" />
            </label>
            <label className="text-sm flex items-center gap-2 pb-2.5">
              <input type="checkbox" name="is_active" defaultChecked={c.is_active} disabled={c.code === "BHD"} className="w-4 h-4 accent-[#a8864a]" /> Offered to customers
            </label>
            {c.code === "BHD" ? <span /> : <button className="a-btn">Save</button>}
          </form>
        ))}
      </div>
    </>
  );
}
