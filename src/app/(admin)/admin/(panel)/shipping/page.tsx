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
    from countries order by sort_order`;
  const inp = "border rounded px-2 py-1 bg-white w-full";
  return (
    <>
      <h1 className="text-2xl font-semibold mb-2">Shipping &amp; countries</h1>
      <p className="text-sm text-neutral-600 mb-4">
        A country is never offered at checkout until you enable it here with a fee and delivery estimate. All amounts are in BHD.
        Enter 0 as the fee for free shipping.
      </p>
      {q.saved && <p className="bg-green-100 text-green-900 p-2 rounded text-sm mb-3">Saved ({q.c}).</p>}
      {q.error && <p className="bg-red-100 text-red-900 p-2 rounded text-sm mb-3">{q.c}: {MSG[q.error] ?? "Could not save."}</p>}
      <div className="space-y-3">
        {rows.map((c) => (
          <form key={c.iso2} id={c.iso2} action={updateCountry}
            className={`rounded shadow p-3 grid gap-2 md:grid-cols-7 items-end ${c.delivery_enabled ? "bg-white" : "bg-neutral-50"}`}>
            <input type="hidden" name="iso2" value={c.iso2} />
            <div className="md:col-span-2">
              <p className="font-medium">{c.name_en} <span className="text-neutral-400 text-xs">{c.iso2}</span></p>
              <p className="text-xs text-neutral-500" dir="rtl">{c.name_ar}</p>
              <label className="text-sm flex items-center gap-1 mt-1">
                <input type="checkbox" name="delivery_enabled" defaultChecked={c.delivery_enabled} /> Delivery enabled</label>
            </div>
            <label className="text-xs">Fee<input name="fee" inputMode="decimal" defaultValue={c.delivery_enabled ? bhd(c.fee_minor) : ""} className={inp} /></label>
            <label className="text-xs">Free over<input name="free_over" inputMode="decimal" defaultValue={bhd(c.free_over_minor)} className={inp} /></label>
            <label className="text-xs">Min order<input name="min_order" inputMode="decimal" defaultValue={Number(c.min_order_minor) ? bhd(c.min_order_minor) : ""} className={inp} /></label>
            <label className="text-xs">Days min / max
              <span className="flex gap-1">
                <input name="eta_min" inputMode="numeric" defaultValue={c.eta_min_days ?? ""} className={inp} />
                <input name="eta_max" inputMode="numeric" defaultValue={c.eta_max_days ?? ""} className={inp} />
              </span></label>
            <button className="border px-3 py-1 rounded text-sm">Save</button>
          </form>
        ))}
      </div>
    </>
  );
}
