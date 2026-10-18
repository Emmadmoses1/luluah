import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, toCsv, parseDateRange, parseDiscount, parseRate } from "../src/lib/admin-forms.ts";

test("csv cells are quoted and neutralise spreadsheet formulas", () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell("=HYPERLINK(\"x\")"), '"\'=HYPERLINK(""x"")"');
  assert.equal(csvCell("+96送"), "'+96送");
  assert.equal(csvCell(null), "");
  assert.equal(toCsv([["a", 1], ["b", 2]]), "a,1\r\nb,2\r\n");
});
test("date ranges default, validate and cap", () => {
  const today = new Date("2026-10-18T10:00:00Z");
  assert.deepEqual(parseDateRange(undefined, undefined, today), { from: "2026-09-19", to: "2026-10-18", error: null });
  assert.equal(parseDateRange("2026-02-30", "2026-03-01", today).from, "2026-01-31");
  assert.match(parseDateRange("2026-10-10", "2026-10-01", today).error, /not be after/);
  assert.match(parseDateRange("2020-01-01", "2026-10-01", today).error, /366/);
});
test("discount form validation", () => {
  const ok = parseDiscount({ code: " eid25 ", kind: "percent", value: "25", min_order: "10", max_uses: "100", starts: "2026-10-01", ends: "2026-10-31" });
  assert.deepEqual(ok, { ok: true, d: { code: "EID25", kind: "percent", value: 25, min_order_minor: 10000, max_uses: 100,
    starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-10-31T23:59:59Z" } });
  assert.equal(parseDiscount({ code: "AB", kind: "percent", value: "10" }).error, "code");
  assert.equal(parseDiscount({ code: "SAVE", kind: "percent", value: "101" }).error, "value");
  assert.equal(parseDiscount({ code: "SAVE", kind: "fixed", value: "2.5" }).d.value, 2500);
  assert.equal(parseDiscount({ code: "SAVE", kind: "fixed", value: "0" }).error, "value");
  assert.equal(parseDiscount({ code: "SAVE", kind: "fixed", value: "1", starts: "2026-02-31" }).error, "dates");
  assert.equal(parseDiscount({ code: "SAVE", kind: "fixed", value: "1", starts: "2026-05-02", ends: "2026-05-01" }).error, "dates");
  assert.equal(parseDiscount({ code: "SAVE", kind: "fixed", value: "1", max_uses: "0" }).error, "uses");
});
test("exchange rates", () => {
  assert.equal(parseRate("2.65957447"), "2.65957447");
  assert.equal(parseRate("0"), null);
  assert.equal(parseRate("-1"), null);
  assert.equal(parseRate("1.123456789"), null);
  assert.equal(parseRate("abc"), null);
});

import { parseDelta, parseAdminUser } from "../src/lib/admin-forms.ts";
import { sniffImage } from "../src/lib/image-sniff.ts";

test("stock deltas", () => {
  assert.equal(parseDelta("+5"), 5);
  assert.equal(parseDelta("-2"), -2);
  assert.equal(parseDelta("0"), null);
  assert.equal(parseDelta("1.5"), null);
  assert.equal(parseDelta("abc"), null);
  assert.equal(parseDelta("1000000"), null);
});
test("admin user form", () => {
  const ok = parseAdminUser({ email: " Staff@Example.com ", role: "staff", password: "a-long-password-1" });
  assert.deepEqual(ok, { ok: true, email: "staff@example.com", role: "staff", password: "a-long-password-1" });
  assert.equal(parseAdminUser({ email: "nope", role: "staff", password: "a-long-password-1" }).error, "email");
  assert.equal(parseAdminUser({ email: "a@b.co", role: "root", password: "a-long-password-1" }).error, "role");
  assert.equal(parseAdminUser({ email: "a@b.co", role: "staff", password: "short" }).error, "password");
});
test("image sniffing uses magic bytes, not names", () => {
  assert.equal(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0])), "image/jpeg");
  assert.equal(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), "image/png");
  const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
  assert.equal(sniffImage(webp), "image/webp");
  assert.equal(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>")), null);
  assert.equal(sniffImage(new Uint8Array([])), null);
});
