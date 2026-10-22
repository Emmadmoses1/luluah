import postgres from "postgres";
import { existsSync } from "node:fs";

const site = (process.argv[2] ?? "").replace(/\/+$/, "");
let bad = 0, warn = 0;
const ok = (m) => console.log("  ✓ " + m);
const no = (m, fix) => { bad++; console.log("  ✗ " + m + (fix ? "\n      → " + fix : "")); };
const wn = (m) => { warn++; console.log("  ! " + m); };
const head = (t) => console.log("\n" + t);

// ---- 1. Files ---------------------------------------------------------------
head("1. Project files (a missing file usually means a paste was skipped)");
const files = [
  "src/components/Reveal.tsx", "src/components/Logo.tsx", "src/components/CartLink.tsx", "src/components/ProductCard.tsx",
  "src/components/MobileMenu.tsx", "src/components/PageHeader.tsx", "src/components/Listing.tsx", "src/components/SiteFooter.tsx",
  "src/components/PolicyPage.tsx", "src/components/PlaceInput.tsx", "src/components/LocationPicker.tsx", "src/components/CheckoutForm.tsx",
  "src/components/Gallery.tsx", "src/components/Spin360.tsx", "src/components/AddToCart.tsx", "src/components/ReviewForm.tsx",
  "src/components/RecentlyViewed.tsx", "src/components/StickyHeader.tsx", "src/components/FloatingActions.tsx", "src/components/Newsletter.tsx",
  "src/components/admin/Badge.tsx", "src/components/admin/Field.tsx", "src/components/admin/TranslationNotice.tsx",
  "src/lib/qty.ts", "src/lib/translate.ts", "src/lib/rates.ts", "src/lib/zoom.ts", "src/lib/places-util.ts", "src/lib/postal-csv.ts",
  "src/lib/admin-forms.ts", "src/lib/image-sniff.ts", "src/lib/pages-content.ts",
  "src/app/api/places/route.ts", "src/app/api/client-error/route.ts", "src/app/api/cart/route.ts", "src/app/api/checkout/route.ts",
  "src/app/(store)/error.tsx", "src/app/(store)/layout.tsx", "src/app/(store)/page.tsx", "src/app/(store)/checkout/page.tsx", "src/app/(store)/cart/page.tsx",
  "src/app/(admin)/admin/ops-actions.ts", "src/app/(admin)/admin/manage-actions.ts", "src/app/(admin)/admin/catalog-actions.ts",
  "src/app/(admin)/admin/settings-actions.ts", "src/app/(admin)/admin/(panel)/postal/page.tsx", "src/app/(admin)/admin/(panel)/launch/page.tsx",
  "src/lib/mailer.ts", "src/lib/maintenance.ts", "src/lib/invoice-token.ts", "src/lib/cron-auth.ts", "src/app/api/cron/maintenance/route.ts",
  "src/app/(invoice)/invoice/[ref]/page.tsx", "src/app/(admin)/admin/email-actions.ts", "src/app/(admin)/admin/(panel)/emails/page.tsx",
  "db/migrations/011_invoices_reminders.sql", "db/migrations/007_places_postal.sql", "db/migrations/008_currency_rate_meta.sql", "db/migrations/009_product_spin.sql", "db/migrations/010_english_fields.sql",
];
const missing = files.filter((f) => !existsSync(f));
if (missing.length === 0) ok(`all ${files.length} expected files are present`);
else missing.forEach((f) => no(`missing: ${f}`, "paste that file again from the earlier message"));

// ---- 2. Environment ---------------------------------------------------------
head("2. Settings (only whether each is set, never the values)");
const env = (k) => Boolean(process.env[k]);
env("DATABASE_URL") ? ok("DATABASE_URL is set") : no("DATABASE_URL is not set", "edit .env");
/^https:\/\//.test(process.env.SITE_URL ?? "") ? ok("SITE_URL is an https address") : wn("SITE_URL is not an https address (needed on Render)");
env("NOWPAYMENTS_API_KEY") && env("NOWPAYMENTS_IPN_SECRET") ? ok("payment provider keys are set") : wn("payment provider keys are not set (checkout creates unpaid orders only)");
process.env.PAYMENTS_LIVE === "1" ? ok("PAYMENTS_LIVE=1 (orders are real)") : wn("PAYMENTS_LIVE is not 1 (every order is marked TEST)");
env("RESEND_API_KEY") && env("EMAIL_FROM") ? ok("email is configured") : wn("email is not configured (no emails are sent)");
env("CRON_SECRET") ? ok("CRON_SECRET is set (reminders and expiry can run)") : wn("CRON_SECRET is not set (reminder emails and automatic expiry will not run)");
env("GOOGLE_TRANSLATE_API_KEY") || env("ANTHROPIC_API_KEY") ? ok("automatic translation key is set") : wn("no translation key (Arabic text must be typed by hand)");

// ---- 3. Database ------------------------------------------------------------
head("3. Database");
const url = process.env.DATABASE_URL;
if (!url || url.includes("PASTE_")) { no("skipped: no DATABASE_URL"); }
else {
  const sql = postgres(url, { max: 1, onnotice: () => {}, connect_timeout: 15 });
  try {
    const [t] = await sql`select now() as t`;
    ok("connected to the database (" + new Date(t.t).toISOString().slice(0, 19) + "Z)");
    const cols = await sql`select table_name as t, column_name as c from information_schema.columns where table_schema = current_schema()`;
    const hasT = (t) => cols.some((x) => x.t === t);
    const hasC = (t, c) => cols.some((x) => x.t === t && x.c === c);
    const need = [
      ["products", "name_en", "010"], ["products", "spin_360", "009"], ["product_variants", "color_en", "010"], ["categories", "name_en", "010"],
      ["currencies", "rate_updated_at", "008"], ["countries", "postal_regex", "007"], ["countries", "postal_hint", "007"],
      ["cities", "geoname_id", "007"], ["postal_codes", "code", "007"], ["product_images", "thumb_path", "earlier"],
      ["admin_users", "must_change_password", "earlier"], ["media", "data", "earlier"], ["newsletter_subscribers", "email", "earlier"],
      ["store_settings", "value", "earlier"], ["discounts", "code", "earlier"], ["reviews", "status", "earlier"], ["payments", "status", "earlier"],
      ["orders", "invoice_no", "011"], ["orders", "reminder_sent_at", "011"], ["email_log", "kind", "011"], ["job_runs", "name", "011"],
    ];
    const gaps = need.filter(([t, c]) => !hasC(t, c));
    if (gaps.length === 0) ok("every table and column the site needs exists");
    else gaps.forEach(([t, c, m]) => no(`missing ${t}.${c} (migration ${m})`, "run: npm run db:migrate   (against THIS database)"));

    for (const [t, c] of [["store_settings", "value"], ["orders", "address"], ["payment_events", "payload"], ["audit_logs", "detail"]]) {
      if (!hasC(t, c)) continue;
      const [r] = await sql`select count(*) as n from ${sql(t)} where jsonb_typeof(${sql(c)}) = 'string'`;
      Number(r.n) === 0 ? ok(`${t}.${c} is stored correctly`) : no(`${t}.${c}: ${r.n} row(s) stored as plain text`, "run: npm run db:repair-json");
    }
    if (hasT("countries")) {
      const [r] = await sql`select count(*) filter (where delivery_enabled) as d, count(*) as n from countries`;
      Number(r.d) > 0 ? ok(`${r.d} of ${r.n} countries have delivery enabled`) : wn("no country has delivery enabled (checkout shows 'delivery unavailable')");
    }
    if (hasT("products")) {
      const [r] = await sql`select count(*) filter (where status = 'published') as pub, count(*) filter (where is_demo) as demo from products`;
      Number(r.pub) > 0 ? ok(`${r.pub} published product(s)`) : wn("no published products");
      Number(r.demo) === 0 ? ok("no demo products") : wn(`${r.demo} demo product(s) still exist`);
    }
    if (hasC("categories", "name_en")) {
      const [r] = await sql`select count(*) filter (where name_en is null) as n from categories`;
      Number(r.n) === 0 ? ok("every category has an English name") : wn(`${r.n} categories have no English name (add them in Admin → Categories)`);
    }
    if (hasT("cities")) {
      const [r] = await sql`select count(*) as n from cities`;
      Number(r.n) > 0 ? ok(`${r.n} cities loaded (location search works)`) : wn("the cities table is empty (location search shows nothing)");
    }
    if (hasT("store_settings")) {
      const [r] = await sql`select value from store_settings where key = 'store'`;
      r && typeof r.value === "object" ? ok("store settings can be read") : no("store settings row is missing or damaged", "run: npm run db:repair-json, then re-save Admin → Store Settings");
    }
  } catch (e) {
    no("database check failed: " + e.message);
  } finally { await sql.end({ timeout: 5 }).catch(() => {}); }
}

// ---- 4. Live site -----------------------------------------------------------
if (site) {
  head(`4. Live site: ${site}`);
  const get = ["/", "/shop", "/cart", "/checkout", "/track", "/about", "/contact", "/faq", "/privacy", "/sitemap.xml", "/robots.txt", "/admin/login",
    "/api/places?scope=delivery&q=riy"];
  for (const p of get) {
    try {
      const r = await fetch(site + p, { redirect: "manual", signal: AbortSignal.timeout(30000) });
      const body = r.status < 400 ? await r.text() : "";
      if (r.status >= 500) no(`${p} → HTTP ${r.status}`, "open Render → Logs and look at the error just before this time");
      else if (/Application error|Internal Server Error/.test(body)) no(`${p} → page contains an error message`);
      else ok(`${p} → HTTP ${r.status}`);
    } catch (e) { no(`${p} → no answer (${e.message})`, "the service may be asleep: wait a minute and run again"); }
  }
  try {
    const r = await fetch(site + "/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [] }), signal: AbortSignal.timeout(30000) });
    const d = await r.json().catch(() => null);
    r.ok && d && Array.isArray(d.lines) ? ok("/api/cart answers correctly (the checkout depends on this)") : no(`/api/cart → HTTP ${r.status}, unexpected reply`, "this is the most likely cause of a checkout crash: check Render Logs");
  } catch (e) { no("/api/cart → no answer (" + e.message + ")"); }
  console.log("\n  Note: a crash that happens only in the customer's browser cannot be seen from here.");
  console.log("  Reproduce it once, then search Render → Logs for: client-error");
}

console.log(`\n${bad === 0 ? "No problems found" : bad + " problem(s) found"}${warn ? `, ${warn} warning(s)` : ""}.`);
process.exit(bad === 0 ? 0 : 1);
