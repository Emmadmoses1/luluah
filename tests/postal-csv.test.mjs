import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parsePostalCsv } from "../scripts/lib/postal-csv.mjs";

test("parseCsv handles quotes, commas, CRLF and BOM", () => {
  const r = parseCsv('\uFEFFa,b\r\n"x, y","say ""hi"""\r\n\r\n');
  assert.deepEqual(r, [["a", "b"], ["x, y", 'say "hi"']]);
});
test("parsePostalCsv validates, normalises digits and dedupes", () => {
  const csv = "country,code,place_name,admin_name\nSA,١١٥٦٤,الرياض,منطقة الرياض\nSA,11564,الرياض,\nSA,1234,قصير,\nXX,11111,؟,\nTN,1000,تونس,\n";
  const r = parsePostalCsv(csv, new Set(["SA", "TN"]), new Map([["SA", "^[0-9]{5}$"], ["TN", "^[0-9]{4}$"]]));
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.rows[0], { country_iso2: "SA", code: "11564", place_name: "الرياض", admin_name: "منطقة الرياض" });
  assert.equal(r.rejected.length, 2);
  assert.match(r.rejected[0].reason, /does not match/);
  assert.match(r.rejected[1].reason, /unknown country/);
});
test("parsePostalCsv reports a bad header", () => {
  assert.match(parsePostalCsv("a,b\n1,2", new Set(["SA"])).error, /Header/);
});

test("parsePostalCsv rescues ZIP+4 style codes and strips invisible marks", () => {
  const csv = "country,code,place_name\nSA,23955-6900,Thuwal\nJO,21144\u200F,Irbid\nSA,5158,Short\nKW,965,Dial code\n";
  const r = parsePostalCsv(csv, new Set(["SA", "JO", "KW"]), new Map([["SA", "^[0-9]{5}$"], ["JO", "^[0-9]{5}$"], ["KW", "^[0-9]{5}$"]]));
  assert.deepEqual(r.rows.map((x) => x.code), ["23955", "21144"]);
  assert.equal(r.rejected.length, 2);
});
