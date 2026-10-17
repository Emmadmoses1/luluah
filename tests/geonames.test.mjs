import test from "node:test";
import assert from "node:assert/strict";
import { arabicName, parseCityLine, parsePostalLine, parseAdmin1 } from "../scripts/lib/geonames.mjs";

const allowed = new Set(["SA", "BH"]);
const city = (iso, alt) => ["108410", "Riyadh", "Riyadh", alt, "24.68", "46.72", "P", "PPLC", iso, "", "10", "", "", "", "5188286", "", "612", "Asia/Riyadh", "2024-01-01"].join("\t");

test("arabicName picks Arabic-only alternates", () => {
  assert.equal(arabicName("Riyadh,الرياض,Er-Riad"), "الرياض");
  assert.equal(arabicName("Riyadh,Er-Riad"), null);
  assert.equal(arabicName("Riyadh,الرياض Riyadh"), null);
  assert.equal(arabicName(""), null);
});
test("parseCityLine keeps allowed countries only", () => {
  const r = parseCityLine(city("SA", "Riyadh,الرياض"), allowed);
  assert.equal(r.name_ar, "الرياض"); assert.equal(r.country_iso2, "SA"); assert.equal(r.population, 5188286);
  assert.equal(parseCityLine(city("FR", "Paris"), allowed), null);
  assert.equal(parseCityLine("too\tshort", allowed), null);
});
test("parsePostalLine validates fields", () => {
  const ok = parsePostalLine(["SA", "11564", "Riyadh", "Riyadh Region", "01", "", "", "", "", "24.7", "46.7", "4"].join("\t"), allowed);
  assert.deepEqual(ok, { country_iso2: "SA", code: "11564", place_name: "Riyadh", admin_name: "Riyadh Region" });
  assert.equal(parsePostalLine(["FR", "75001", "Paris"].join("\t"), allowed), null);
  assert.equal(parsePostalLine(["SA", "", "X"].join("\t"), allowed), null);
});
test("parseAdmin1 maps codes to names", () => {
  assert.equal(parseAdmin1("SA.10\tRiyadh\tRiyadh\t1\nSA.02\tMakkah\tMakkah\t2\n").get("SA.10"), "Riyadh");
});
