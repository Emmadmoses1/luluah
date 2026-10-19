import { requireAdmin } from "@/lib/auth";
import { getSettings, paymentsConfigured } from "@/lib/settings";
import { savePaymentSettings } from "@/app/(admin)/admin/manage-actions";
import Field from "@/components/admin/Field";

function Row({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{ok ? "✓" : "✕"}</span>
      <div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-neutral-500">{hint}</p></div>
    </li>
  );
}

export default async function PaymentSettings({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const q = await searchParams;
  const { payments } = await getSettings();
  const site = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
  const live = process.env.PAYMENTS_LIVE === "1";
  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Configuration</p>
        <h1 className="text-3xl font-semibold mt-1">Payment settings</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-2xl">Cryptocurrency payments run through NOWPayments. Secret keys are kept in the server environment on Render and are never shown or stored here.</p>
      </div>
      {q.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved.</p>}
      {q.error && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">The expiry must be a whole number of hours from 1 to 168.</p>}

      <section className="a-card p-6 mb-6 max-w-3xl">
        <h2 className="font-semibold">Provider status</h2>
        <ul className="divide-y divide-neutral-100 mt-2">
          <Row ok={Boolean(process.env.NOWPAYMENTS_API_KEY)} label="NOWPAYMENTS_API_KEY" hint="Set it in Render, under Environment." />
          <Row ok={Boolean(process.env.NOWPAYMENTS_IPN_SECRET)} label="NOWPAYMENTS_IPN_SECRET" hint="The webhook (IPN) secret from your NOWPayments dashboard." />
          <Row ok={/^https:\/\//.test(site)} label="SITE_URL is an https address" hint={site ? "Current value: " + site : "Not set."} />
          <Row ok={paymentsConfigured()} label="Payments can be started" hint="All three values above must be present." />
          <Row ok={live} label="PAYMENTS_LIVE=1" hint={live ? "New orders are real orders." : "Not set: every new order is marked as a TEST order and excluded from revenue, customers and reviews."} />
        </ul>
        {site && (
          <div className="mt-4 rounded-xl bg-[#faf6ee] p-4 text-sm">
            <p className="font-semibold">Webhook address to enter at your provider</p>
            <p dir="ltr" className="mt-1 font-mono text-xs break-all">{site}/api/webhooks/nowpayments</p>
          </div>
        )}
      </section>

      <form action={savePaymentSettings} className="a-card p-6 space-y-4 max-w-3xl">
        <h2 className="font-semibold">Checkout behaviour</h2>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="crypto_enabled" defaultChecked={payments.crypto_enabled} className="w-4 h-4 accent-[#a8864a]" />
          Offer cryptocurrency payment (still requires the provider status above to be complete)
        </label>
        <Field label="Unpaid orders expire after (hours)" hint="Unpaid orders are cancelled and their stock released after this time.">
          <input name="order_expiry_hours" inputMode="numeric" defaultValue={payments.order_expiry_hours} className="a-input !w-32" />
        </Field>
        <Field label="Message shown to customers while payment is pending (Arabic, optional)">
          <textarea name="instructions_ar" dir="rtl" rows={4} maxLength={1000} defaultValue={payments.instructions_ar} className="a-input" />
        </Field>
        <button className="a-btn">Save</button>
      </form>
    </>
  );
}
