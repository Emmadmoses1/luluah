import { sql } from "@/lib/db";
import { updateCountry } from "@/app/(admin)/admin/order-actions";

const MSG: Record<string, string> = {
  money: "Amounts must be numbers with up to 3 decimals (for example 1.500).",
  eta: "Delivery estimate must be whole days (0-90), with minimum not above maximum.",
  required: "To enable delivery you must fill in the shipping fee (0 means free) and both delivery-estimate days.",
};
const bhd = (m: string | null) => (m === null ? "" : (Number(m) / 1000).toFixed(3));

export default async function Shipping({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; c?: string }> }) {
  const q = await searchParams;
  const rows = await sql<{ iso2: string; name_en: string; name_ar: string; delivery_enabled: boolean; fee_minor: string;
    free_over_minor: string | null; min_order_minor: string; eta_min_days: number | null; eta_max_days: number | null }[]>`
    select iso2, name_en, name_ar, delivery_enabled, fee_minor, free_over_minor, min_order_minor, eta_min_days, eta_max_days
    from countries order by delivery_enabled desc, sort_order`;
  const on = rows.filter((r) => r.delivery_enabled).length;
  const inp = "a-input";
  const lab = "a-label";
  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Delivery</p>
        <h1 className="text-3xl font-semibold mt-1">Shipping &amp; countries</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl">
          A country is never offered at checkout until you enable it here with a fee and delivery estimate. All amounts are in BHD.
          Enter 0 as the fee for free shipping. <b>{on}</b> of {rows.length} countries are enabled.
        </p>
      </div>
      {q.saved && <p role="status" className="rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm mb-4">Saved ({q.c}).</p>}
      {q.error && <p role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm mb-4">{q.c}: {MSG[q.error] ?? "Could not save."}</p>}
      <div className="space-y-3">
        {rows.map((c) => (
          <form key={c.iso2} id={c.iso2} action={updateCountry}
            className={`a-card p-4 grid gap-3 md:grid-cols-7 items-end border-l-4 ${c.delivery_enabled ? "border-l-emerald-500" : "border-l-neutral-300 bg-neutral-50"}`}>
            <input type="hidden" name="iso2" value={c.iso2} />
            <div className="md:col-span-2">
              <p className="font-semibold">{c.name_en} <span className="text-neutral-400 text-xs font-normal">{c.iso2}</span></p>
              <p className="text-xs text-neutral-500" dir="rtl">{c.name_ar}</p>
              <label className="text-sm flex items-center gap-2 mt-2">
                <input type="checkbox" name="delivery_enabled" defaultChecked={c.delivery_enabled} className="w-4 h-4 accent-[#a8864a]" /> Delivery enabled</label>
            </div>
            <label className={lab}>Fee<input name="fee" inputMode="decimal" defaultValue={c.delivery_enabled ? bhd(c.fee_minor) : ""} className={`${inp} mt-1.5`} /></label>
            <label className={lab}>Free over<input name="free_over" inputMode="decimal" defaultValue={bhd(c.free_over_minor)} className={`${inp} mt-1.5`} /></label>
            <label className={lab}>Min order<input name="min_order" inputMode="decimal" defaultValue={Number(c.min_order_minor) ? bhd(c.min_order_minor) : ""} className={`${inp} mt-1.5`} /></label>
            <label className={lab}>Days min / max
              <span className="flex gap-1 mt-1.5">
                <input name="eta_min" inputMode="numeric" defaultValue={c.eta_min_days ?? ""} className={inp} />
                <input name="eta_max" inputMode="numeric" defaultValue={c.eta_max_days ?? ""} className={inp} />
              </span></label>
            <button className="a-btn">Save</button>
          </form>
        ))}
      </div>
    </>
  );
}
