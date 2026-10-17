import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { sortKeys, ipnSignature, verifyIpn } from "../src/lib/payments/sig.ts";
import { mapProviderStatus, canTransition, bhdMinorToUsdCents, amountMatches } from "../src/lib/payments/status.ts";
import { evaluateDiscount, normalizeCode } from "../src/lib/discounts.ts";
import { parseBhd } from "../src/lib/money.ts";
import { shippingFor } from "../src/lib/shipping.ts";

const payload = { payment_status: "finished", payment_id: 5, fee: { serviceFee: 0, currency: "btc" }, order_id: "ABC" };

test("IPN signature sorts keys recursively and uses HMAC-SHA512", () => {
  const manual = '{"fee":{"currency":"btc","serviceFee":0},"order_id":"ABC","payment_id":5,"payment_status":"finished"}';
  assert.equal(JSON.stringify(sortKeys(payload)), manual);
  assert.equal(ipnSignature(payload, "s3cret"), createHmac("sha512", "s3cret").update(manual).digest("hex"));
});
test("IPN verification accepts valid, rejects tampered/wrong secret/missing header", () => {
  const sig = ipnSignature(payload, "s3cret");
  assert.equal(verifyIpn(payload, sig, "s3cret"), true);
  assert.equal(verifyIpn({ ...payload, payment_status: "waiting" }, sig, "s3cret"), false);
  assert.equal(verifyIpn(payload, sig, "other"), false);
  assert.equal(verifyIpn(payload, null, "s3cret"), false);
  assert.equal(verifyIpn(payload, sig, ""), false);
  assert.equal(verifyIpn(payload, "abc", "s3cret"), false);
});
test("provider statuses map correctly", () => {
  assert.equal(mapProviderStatus("finished"), "paid");
  assert.equal(mapProviderStatus("confirmed"), "confirming");
  assert.equal(mapProviderStatus("partially_paid"), "partially_paid");
  assert.equal(mapProviderStatus("waiting"), "pending");
  assert.equal(mapProviderStatus("whatever"), null);
});
test("state never moves backwards; paid only becomes refunded", () => {
  assert.equal(canTransition("paid", "pending"), false);
  assert.equal(canTransition("paid", "expired"), false);
  assert.equal(canTransition("paid", "refunded"), true);
  assert.equal(canTransition("pending", "confirming"), true);
  assert.equal(canTransition("confirming", "pending"), false);
  assert.equal(canTransition("refunded", "paid"), false);
  assert.equal(canTransition("pending", "pending"), false);
});
test("BHD to USD cents rounds up", () => {
  assert.equal(bhdMinorToUsdCents(1000, 2.65957447), 266);
  assert.equal(bhdMinorToUsdCents(376, 2.659574468), 100);
});
test("amount check requires usd and tolerance", () => {
  assert.equal(amountMatches(2.66, 2.66, "usd"), true);
  assert.equal(amountMatches(2.66, 2.0, "usd"), false);
  assert.equal(amountMatches(2.66, 2.66, "eur"), false);
});
const d = { id: "1", code: "WELCOME", kind: "percent", value: 10, min_order_minor: "10000", max_uses: 2, used_count: 0, starts_at: null, ends_at: null, is_active: true };
test("discounts", () => {
  assert.deepEqual(evaluateDiscount(d, 50000), { ok: true, id: "1", code: "WELCOME", amountMinor: 5000 });
  assert.equal(evaluateDiscount(d, 5000).ok, false);
  assert.equal(evaluateDiscount({ ...d, used_count: 2 }, 50000).ok, false);
  assert.equal(evaluateDiscount({ ...d, is_active: false }, 50000).ok, false);
  assert.equal(evaluateDiscount({ ...d, ends_at: new Date(0) }, 50000).ok, false);
  assert.equal(evaluateDiscount(undefined, 50000).ok, false);
  const fixed = evaluateDiscount({ ...d, kind: "fixed", value: 99999, min_order_minor: "0" }, 20000);
  assert.equal(fixed.ok && fixed.amountMinor, 20000);
  assert.equal(normalizeCode(" wel-come! "), "WEL-COME");
});
test("money and shipping", () => {
  assert.equal(parseBhd("12.5"), 12500);
  assert.equal(parseBhd("12.5555"), null);
  assert.equal(parseBhd("-1"), null);
  assert.equal(shippingFor({ fee_minor: 2000, free_over_minor: 30000 }, 30000), 0);
  assert.equal(shippingFor({ fee_minor: 2000, free_over_minor: 30000 }, 29999), 2000);
  assert.equal(shippingFor({ fee_minor: 2000, free_over_minor: null }, 999999), 2000);
});
