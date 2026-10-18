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
