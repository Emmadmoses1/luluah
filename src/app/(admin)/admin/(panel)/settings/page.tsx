import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveStoreSettings } from "../../settings-actions";

export const dynamic = "force-dynamic";

const ERR: Record<string, string> = {
  email: "Enter a valid contact email.", phone: "Phone may contain digits, spaces, + ( ) and - only.",
  whatsapp: "WhatsApp number must be digits with an optional leading +.", days: "Return window must be a whole number from 0 to 90.",
  instagram: "Instagram link must start with https://", x: "X link must start with https://", tiktok: "TikTok link must start with https://",
  snapchat: "Snapchat link must start with https://", facebook: "Facebook link must start with https://",
};

function F({ label, name, v, dir, ph, hint }: { label: string; name: string; v: string; dir?: "rtl" | "ltr"; ph?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="a-label">{label}</span>
      <input name={name} defaultValue={v} dir={dir} placeholder={ph} className="a-input mt-1.5" />
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const [q, { store: s }] = await Promise.all([searchParams, getSettings()]);
  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Configuration</p>
        <h1 className="text-3xl font-semibold mt-1">Store Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">These details appear on the Arabic storefront (footer, contact page, announcement bar).</p>
      </div>
      {q.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Settings saved.</p>}
      {q.error && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{ERR[q.error] ?? "Check the fields and try again."}</p>}

      <form action={saveStoreSettings} className="space-y-6 max-w-3xl">
        <section className="a-card p-6 space-y-4">
          <h2 className="font-semibold">Storefront</h2>
          <F label="Announcement bar (Arabic)" name="announcement_ar" v={s.announcement_ar} dir="rtl" hint="Shown above the header. Leave empty for the default welcome text." />
          <F label="Return window (days)" name="return_days" v={String(s.return_days)} dir="ltr" />
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="show_demo_notice" defaultChecked={s.show_demo_notice} className="w-4 h-4 accent-[#a8864a]" />
            Show demonstration-products notice and the legal-review notice on policy pages
          </label>
        </section>

        <section className="a-card p-6 space-y-4">
          <h2 className="font-semibold">Contact information</h2>
          <p className="text-xs text-neutral-500">Only enter real business details. Empty fields are hidden on the storefront.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Phone" name="contact_phone" v={s.contact_phone} dir="ltr" ph="+973 …" />
            <F label="WhatsApp number" name="whatsapp" v={s.whatsapp} dir="ltr" ph="+973 …" />
            <F label="Email" name="contact_email" v={s.contact_email} dir="ltr" />
            <F label="Working hours (Arabic)" name="hours_ar" v={s.hours_ar} dir="rtl" />
          </div>
          <F label="Address (Arabic)" name="address_ar" v={s.address_ar} dir="rtl" />
        </section>

        <section className="a-card p-6 space-y-4">
          <h2 className="font-semibold">Social media links</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Instagram" name="instagram" v={s.instagram} dir="ltr" ph="https://instagram.com/…" />
            <F label="X" name="x" v={s.x} dir="ltr" ph="https://x.com/…" />
            <F label="TikTok" name="tiktok" v={s.tiktok} dir="ltr" ph="https://tiktok.com/@…" />
            <F label="Snapchat" name="snapchat" v={s.snapchat} dir="ltr" ph="https://snapchat.com/add/…" />
            <F label="Facebook" name="facebook" v={s.facebook} dir="ltr" ph="https://facebook.com/…" />
          </div>
        </section>

        <button className="a-btn">Save settings</button>
      </form>
    </>
  );
}
