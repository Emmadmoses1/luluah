import test from "node:test";
import assert from "node:assert/strict";
import { bahrainRegion } from "../src/lib/places-util.ts";

test("Bahrain governorates are matched from GeoNames names", () => {
  assert.equal(bahrainRegion("Manama"), "محافظة العاصمة");
  assert.equal(bahrainRegion("Capital Governorate"), "محافظة العاصمة");
  assert.equal(bahrainRegion("Muharraq"), "محافظة المحرق");
  assert.equal(bahrainRegion("Ash Shamaliyah"), "المحافظة الشمالية");
  assert.equal(bahrainRegion("Northern Governorate"), "المحافظة الشمالية");
  assert.equal(bahrainRegion("Al Janubiyah"), "المحافظة الجنوبية");
  assert.equal(bahrainRegion("Al Wusta"), null);
  assert.equal(bahrainRegion(null), null);
  assert.equal(bahrainRegion(""), null);
});
