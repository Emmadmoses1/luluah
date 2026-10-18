import test from "node:test";
import assert from "node:assert/strict";
import { buildQuery, elementsToRows, toCsv } from "../scripts/lib/osm.mjs";
import { parsePostalCsv } from "../scripts/lib/postal-csv.mjs";

const json = { elements: [
  { type: "node", tags: { "addr:postcode": "١١٥٦٤", "addr:city": "Riyadh", "addr:state": "Riyadh Region" } },
  { type: "way", tags: { "addr:postcode": "11564;11565", "addr:city": "Riyadh" } },
  { type: "node", tags: { "addr:postcode": "12345", "addr:suburb": 'Al "Olaya"' } },
  { type: "node", tags: { "addr:postcode": "99999" } },
  { type: "relation", tags: { boundary: "postal_code", postal_code: "11000", name: "Diriyah" } },
] };

test("buildQuery rejects bad ISO codes (no injection)", () => {
  assert.throws(() => buildQuery('SA"];out;'));
  assert.match(buildQuery("SA"), /"ISO3166-1"="SA"/);
});
test("elementsToRows normalises, dedupes and drops incomplete entries", () => {
  const rows = elementsToRows(json, "SA");
  assert.equal(rows.length, 3);
  assert.equal(rows[0].code, "11564");
  assert.equal(rows.some((r) => r.code === "99999"), false);
});
test("CSV round-trips through the validated importer parser", () => {
  const csv = toCsv(elementsToRows(json, "SA"));
  const r = parsePostalCsv(csv, new Set(["SA"]), new Map([["SA", "^[0-9]{5}$"]]));
  assert.equal(r.rejected.length, 0);
  assert.equal(r.rows.length, 3);
  assert.equal(r.rows[1].place_name, 'Al "Olaya"');
});
