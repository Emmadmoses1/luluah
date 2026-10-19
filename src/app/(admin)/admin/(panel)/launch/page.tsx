import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings, paymentsConfigured } from "@/lib/settings";

type Check = { ok: boolean; title: string; hint: string; href?: string };

export default async function Launch() {
  await requireAdmin(["owner", "manager"]);
  const { store, payments } = await getSettings();
  const [d] = await sql<{ real_products: string; demo_products: string; no_image: string; sold_out: string;
    test_orders: string; countries: string; pending_pw: string }[]>`
    select
      (select count(*) from products where status = 'published' and not is_demo) as real_products,
      (select count(*) from products where is_demo) as demo_products,
      (select count(*) from products p where p.status = 'published' and not exists (select 1 from product_images i where i.product_id = p.id)) as no_image,
      (select count(*) from products p where p.status = 'published' and not exists (select 1 from product_variants v where v.product_id = p.id and v.stock > 0)) as sold_out,
      (select count(*) from orders where is_test) as test_orders,
      (select count(*) from countries where delivery_enabled) as countries,
      (select count(*) from admin_users where must_change_password) as pending_pw`;
  const site = process.env.SITE_URL ?? "";
  const n = (s: string) => Number(s);

  const groups: { name: string; checks: Check[] }[] = [
    { name: "Payments", checks: [
      { ok: paymentsConfigured(), title: "Payment provider keys are set", hint: "NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET and SITE_URL in Render.", href: "/admin/payments" },
      { ok: /^https:\/\//.test(site), title: "SITE_URL uses https", hint: site || "Not set.", href: "/admin/payments" },
      { ok: process.env.PAYMENTS_LIVE === "1", title: "Live payments are switched on (PAYMENTS_LIVE=1)", hint: "Until then every order is a test order that won't be fulfilled.", href: "/admin/payments" },
      { ok: payments.crypto_enabled, title: "Cryptocurrency payment is enabled", hint: "Checkout behaviour on the Payment settings page.", href: "/admin/payments" },
    ] },
    { name: "Catalog", checks: [
      { ok: n(d.real_products) > 0, title: "At least one real product is published", hint: `${d.real_products} published.`, href: "/admin/products/new" },
      { ok: n(d.demo_products) === 0, title: "No demo products remain", hint: `${d.demo_products} demo products found. Run: npm run demo:remove` },
      { ok: n(d.no_image) === 0, title: "Every published product has an image", hint: `${d.no_image} without an image.`, href: "/admin/products" },
      { ok: n(d.sold_out) === 0, title: "No published product is completely sold out", hint: `${d.sold_out} sold out.`, href: "/admin/inventory?low=1" },
    ] },
    { name: "Delivery & store details", checks: [
      { ok: n(d.countries) > 0, title: "Delivery is enabled for at least one country", hint: `${d.countries} countries enabled.`, href: "/admin/shipping" },
      { ok: Boolean(store.contact_phone || store.whatsapp || store.contact_email), title: "Customer contact details are filled in", hint: "Phone, WhatsApp or email shown on the contact page.", href: "/admin/settings" },
      { ok: !store.show_demo_notice, title: "Demo and legal-review notices are switched off", hint: "Only after your policy pages have been reviewed.", href: "/admin/settings" },
    ] },
    { name: "Operations", checks: [
      { ok: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), title: "Customer emails are configured", hint: "RESEND_API_KEY and EMAIL_FROM in Render. Without them no emails are sent." },
      { ok: Boolean(process.env.ADMIN_NOTIFY_EMAIL), title: "New-order alerts go to an address", hint: "ADMIN_NOTIFY_EMAIL in Render." },
      { ok: n(d.test_orders) === 0, title: "No test orders remain", hint: `${d.test_orders} test orders found. Run: npm run demo:remove` },
      { ok: n(d.pending_pw) === 0, title: "All admins have chosen their own password", hint: `${d.pending_pw} admins still need to change a temporary password.`, href: "/admin/users" },
    ] },
  ];
  const all = groups.flatMap((g) => g.checks);
  const done = all.filter((c) => c.ok).length;

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Go live</p>
        <h1 className="text-3xl font-semibold mt-1">Launch checklist</h1>
        <p className="text-sm text-neutral-600 mt-2">{done} of {all.length} checks pass. The policy pages (shipping, returns, privacy, terms) are drafts: have them reviewed against your real business terms before launch.</p>
        <div className="mt-3 h-2 max-w-md rounded-full bg-neutral-200 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#a8864a] to-[#e3c88d]" style={{ width: `${(done / all.length) * 100}%` }} /></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((g) => (
          <section key={g.name} className="a-card p-5">
            <h2 className="font-semibold">{g.name}</h2>
            <ul className="divide-y divide-neutral-100 mt-2">
              {g.checks.map((c) => (
                <li key={c.title} className="flex items-start gap-3 py-3">
                  <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs font-bold ${c.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{c.ok ? "✓" : "✕"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{c.title}</p>
                    <p className="text-xs text-neutral-500 break-words">{c.hint}</p>
                    {!c.ok && c.href && <Link href={c.href} className="text-xs text-[#a8864a] hover:underline">Fix this →</Link>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
