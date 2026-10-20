import { sql } from "@/lib/db";
import CheckoutForm, { type CountryOpt } from "@/components/CheckoutForm";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const rows = await sql<{ iso2: string; name_ar: string; dial_code: string; fee_minor: string;
    free_over_minor: string | null; min_order_minor: string; eta_min_days: number | null; eta_max_days: number | null;
    postal_regex: string | null; postal_hint: string | null;
    cur_code: string | null; cur_decimals: number | null; cur_rate: string | null }[]>`
    select k.iso2, k.name_ar, k.dial_code, k.fee_minor, k.free_over_minor, k.min_order_minor, k.eta_min_days, k.eta_max_days,
           k.postal_regex, k.postal_hint, cu.code as cur_code, cu.decimals as cur_decimals, cu.rate_to_base as cur_rate
    from countries k
    left join currencies cu on cu.code = k.currency_code and cu.is_active and cu.rate_to_base is not null
    where k.delivery_enabled order by k.sort_order`;
  const countries: CountryOpt[] = rows.map((r) => ({
    iso2: r.iso2, name_ar: r.name_ar, dial_code: r.dial_code, fee_minor: Number(r.fee_minor),
    free_over_minor: r.free_over_minor === null ? null : Number(r.free_over_minor),
    min_order_minor: Number(r.min_order_minor), eta_min_days: r.eta_min_days, eta_max_days: r.eta_max_days,
    postal_regex: r.postal_regex, postal_hint: r.postal_hint,
    cur: r.cur_code && r.cur_code !== "BHD" && r.cur_decimals !== null && r.cur_rate !== null
      ? { code: r.cur_code, decimals: r.cur_decimals, rate: Number(r.cur_rate) } : null,
  }));
  return (
    <>
      <PageHeader eyebrow="خطوة أخيرة" title="إتمام الطلب" />
      <main className="max-w-6xl mx-auto px-4 mt-10">
        {countries.length === 0
          ? <p className="py-16 text-center">التوصيل غير متاح حالياً. يرجى المحاولة لاحقاً.</p>
          : <CheckoutForm countries={countries} />}
      </main>
    </>
  );
}
