import test from "node:test";
import assert from "node:assert/strict";
import { limitsFor, clampQty, HARD_MAX_QTY } from "../src/lib/qty.ts";
import { parseJsonArray, resolveArabic, translateToArabic, translationProvider } from "../src/lib/translate.ts";
import { parseRates } from "../src/lib/rates.ts";
import { parsePostalCsv } from "../src/lib/postal-csv.ts";

test("quantity limits follow min/max and stock", () => {
  assert.deepEqual(limitsFor(500, 20, 100000), { min: 20, max: 500 });
  assert.deepEqual(limitsFor(1_000_000, 20, 100000), { min: 20, max: 100000 });
  assert.deepEqual(limitsFor(7, 20, 100000), { min: 7, max: 7 });
  assert.deepEqual(limitsFor(0, 20, 100000), { min: 0, max: 0 });
  assert.equal(HARD_MAX_QTY, 100000);
  assert.equal(clampQty(5, 500, 20, 1000), 20);
  assert.equal(clampQty(5000, 500, 20, 1000), 500);
  assert.equal(clampQty(60, 500, 20, 1000), 60);
  assert.equal(clampQty(5, 0, 20, 1000), 0);
  assert.equal(clampQty(NaN, 500, 20, 1000), 20);
});

test("model replies are parsed strictly", () => {
  assert.deepEqual(parseJsonArray('Here: ["أ","ب"]', 2), ["أ", "ب"]);
  assert.equal(parseJsonArray('["أ"]', 2), null);
  assert.equal(parseJsonArray("no json", 1), null);
  assert.equal(parseJsonArray("[1,2]", 2), null);
});

test("typed Arabic wins; English is translated otherwise", async () => {
  const fake = async (t) => t.map((x) => `AR(${x})`);
  const r = await resolveArabic([{ en: "Black abaya", ar: "" }, { en: "Silk", ar: "حرير" }, { en: "", ar: "" }, { en: "Gold", ar: "x", force: true }], fake, true);
  assert.deepEqual(r, { ok: true, ar: ["AR(Black abaya)", "حرير", "", "AR(Gold)"] });
  assert.deepEqual(await resolveArabic([{ en: "A", ar: "" }], fake, false), { ok: false, error: "translate" });
  assert.deepEqual(await resolveArabic([{ en: "A", ar: "" }], async () => null, true), { ok: false, error: "translate_failed" });
  assert.deepEqual(await resolveArabic([{ en: "A", ar: "ب" }], async () => null, false), { ok: true, ar: ["ب"] });
});

test("providers: Google and Anthropic request/response shapes", async () => {
  const real = globalThis.fetch, k1 = process.env.GOOGLE_TRANSLATE_API_KEY, k2 = process.env.ANTHROPIC_API_KEY;
  try {
    delete process.env.GOOGLE_TRANSLATE_API_KEY; delete process.env.ANTHROPIC_API_KEY;
    assert.equal(translationProvider(), null);
    assert.equal(await translateToArabic(["Hello"]), null);

    let seen;
    process.env.GOOGLE_TRANSLATE_API_KEY = "g-key";
    globalThis.fetch = async (url, init) => { seen = { url: String(url), body: JSON.parse(init.body) };
      return new Response(JSON.stringify({ data: { translations: [{ translatedText: "مرحبا" }, { translatedText: "عباءة" }] } }), { status: 200 }); };
    assert.deepEqual(await translateToArabic(["Hello", "", "Abaya"]), ["مرحبا", "", "عباءة"]);
    assert.match(seen.url, /translate\/v2\?key=g-key/);
    assert.deepEqual(seen.body, { q: ["Hello", "Abaya"], source: "en", target: "ar", format: "text" });

    delete process.env.GOOGLE_TRANSLATE_API_KEY; process.env.ANTHROPIC_API_KEY = "a-key";
    globalThis.fetch = async (url, init) => { seen = { url: String(url), headers: init.headers, body: JSON.parse(init.body) };
      return new Response(JSON.stringify({ content: [{ type: "text", text: '["مرحبا"]' }] }), { status: 200 }); };
    assert.deepEqual(await translateToArabic(["Hello"]), ["مرحبا"]);
    assert.equal(seen.url, "https://api.anthropic.com/v1/messages");
    assert.equal(seen.headers["x-api-key"], "a-key");

    globalThis.fetch = async () => new Response("nope", { status: 500 });
    assert.equal(await translateToArabic(["Hello"]), null);
  } finally {
    globalThis.fetch = real;
    if (k1 === undefined) delete process.env.GOOGLE_TRANSLATE_API_KEY; else process.env.GOOGLE_TRANSLATE_API_KEY = k1;
    if (k2 === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = k2;
  }
});

test("exchange rates are read defensively", () => {
  const j = { result: "success", rates: { BHD: 1, SAR: 9.9733, AED: "9.7655", XXX: -1, KWD: 0.8123456789 } };
  assert.deepEqual(parseRates(j, ["BHD", "SAR", "AED", "XXX", "KWD", "QAR"]), { SAR: "9.9733", AED: "9.7655", KWD: "0.81234568" });
  assert.deepEqual(parseRates({ result: "error" }, ["SAR"]), {});
  assert.deepEqual(parseRates(null, ["SAR"]), {});
});

test("TypeScript copy of the CSV parser", () => {
  const csv = "country,code,place_name,admin_name\nSA,23955-6900,Thuwal,\nSA,١١٥٦٤,الرياض,منطقة الرياض\nSA,1234,Short,\nXX,11111,x,\n";
  const r = parsePostalCsv(csv, new Set(["SA"]), new Map([["SA", "^[0-9]{5}$"]]));
  assert.deepEqual(r.rows.map((x) => x.code), ["23955", "11564"]);
  assert.equal(r.rejected.length, 2);
});
