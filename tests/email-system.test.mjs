import test from "node:test";
import assert from "node:assert/strict";
import { invoiceToken, verifyInvoiceToken } from "../src/lib/invoice-token.ts";
import { isAuthorized } from "../src/lib/cron-auth.ts";
import { invoiceEmail, reminderEmail, expiredEmail, bhdFmt } from "../src/lib/email-templates.ts";

const base = { invoiceNo: 1001, ref: "ABCD2345WXYZ", name: "Sara <b>", date: "2026-10-21", countryAr: "البحرين", test: false, confirmed: true,
  items: [{ name: "عباءة <script>", variant: "M · أسود", qty: 20, unit: "10.000 د.ب", line: "200.000 د.ب" }],
  subtotal: "200.000 د.ب", discount: null, shipping: "2.000 د.ب", total: "202.000 د.ب",
  seller: { name: "", address: "", phone: "", email: "", tax: "" }, link: "https://x.test/invoice/ABCD2345WXYZ?t=1" };

test("invoice links are signed per order", () => {
  const k = "unit-test-key";
  const t = invoiceToken("ABCD2345WXYZ", k);
  assert.equal(t.length, 32);
  assert.equal(verifyInvoiceToken("ABCD2345WXYZ", t, k), true);
  assert.equal(verifyInvoiceToken("ABCD2345WXYY", t, k), false);
  assert.equal(verifyInvoiceToken("ABCD2345WXYZ", t.slice(1), k), false);
  assert.equal(verifyInvoiceToken("ABCD2345WXYZ", "", k), false);
  assert.equal(verifyInvoiceToken("ABCD2345WXYZ", t, "other-key"), false);
});

test("the cron endpoint only accepts the exact secret", () => {
  const s = "a-long-random-secret-123";
  assert.equal(isAuthorized(`Bearer ${s}`, s), true);
  assert.equal(isAuthorized(`Bearer ${s}x`, s), false);
  assert.equal(isAuthorized(s, s), false);
  assert.equal(isAuthorized(null, s), false);
  assert.equal(isAuthorized(`Bearer ${s}`, undefined), false);
  assert.equal(isAuthorized("Bearer short", "short"), false);
});

test("invoice email escapes customer text and shows totals", () => {
  const m = invoiceEmail(base);
  assert.ok(!m.html.includes("<script>") && !m.html.includes("Sara <b>"));
  assert.ok(m.html.includes("&lt;script&gt;") && m.html.includes("202.000 د.ب") && m.html.includes("1001"));
  assert.ok(!m.html.includes("الرقم الضريبي"));
  assert.match(m.subject, /LU-ABCD-2345-WXYZ/);
  const withSeller = invoiceEmail({ ...base, discount: "5.000 د.ب", test: true, seller: { ...base.seller, name: "شركة", tax: "123" } });
  assert.ok(withSeller.html.includes("الرقم الضريبي") && withSeller.html.includes("نسخة تجريبية") && withSeller.html.includes("-5.000 د.ب"));
});

test("reminder and expiry emails link to the right order", () => {
  const r = reminderEmail({ name: "Sara", ref: "ABCD2345WXYZ", total: "10.000 د.ب", siteUrl: "https://x.test", hoursLeft: 12 });
  assert.ok(r.html.includes("https://x.test/order/ABCD2345WXYZ"));
  assert.ok(expiredEmail({ name: "S", ref: "ABCD2345WXYZ", siteUrl: "https://x.test" }).subject.includes("LU-ABCD"));
  assert.equal(bhdFmt("12500"), "12.500 د.ب");
});
