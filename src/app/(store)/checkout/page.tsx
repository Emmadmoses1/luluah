import { sql } from "@/lib/db";
import CheckoutForm, { type CountryOpt } from "@/components/CheckoutForm";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const rows = await sql<{ iso2: string; name_ar: string; dial_code: string; fee_minor: string;
    free_over_minor: string | null; min_order_minor: string; eta_min_days: number | null; eta_max_days: number | null;
    postal_regex: string | null; postal_hint: string | null }[]>`
    select iso2, name_ar, dial_code, fee_minor, free_over_minor, min_order_minor, eta_min_days, eta_max_days, postal_regex, postal_hint
    from countries where delivery_enabled order by sort_order`;
  const countries: CountryOpt[] = rows.map((r) => ({
    iso2: r.iso2, name_ar: r.name_ar, dial_code: r.dial_code, fee_minor: Number(r.fee_minor),
    free_over_minor: r.free_over_minor === null ? null : Number(r.free_over_minor),
    min_order_minor: Number(r.min_order_minor), eta_min_days: r.eta_min_days, eta_max_days: r.eta_max_days,
    postal_regex: r.postal_regex, postal_hint: r.postal_hint,
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
