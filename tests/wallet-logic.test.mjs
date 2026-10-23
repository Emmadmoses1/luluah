import test from "node:test";
import assert from "node:assert/strict";
import { convertAmount, formatUnit, validateDeposit, buildOnrampUrl } from "../src/lib/converter.ts";
import { parseRegister, parseLogin, passwordProblem, safeNext } from "../src/lib/account-forms.ts";
import { parseCoinGecko } from "../src/lib/crypto-rates.ts";

const units = [
  { code: "BHD", usd: 2.659574, decimals: 3, kind: "fiat" }, { code: "USD", usd: 1, decimals: 2, kind: "fiat" },
  { code: "SAR", usd: 0.2666, decimals: 2, kind: "fiat" }, { code: "BTC", usd: 60000, decimals: 8, kind: "crypto" },
  { code: "USDT", usd: 1, decimals: 2, kind: "crypto" },
];

test("converter pivots through USD", () => {
  assert.equal(convertAmount(100, "USD", "USD", units), 100);
  assert.ok(Math.abs(convertAmount(10, "BHD", "USD", units) - 26.59574) < 1e-9);
  assert.ok(Math.abs(convertAmount(60000, "USD", "BTC", units) - 1) < 1e-12);
  assert.ok(Math.abs(convertAmount(1, "BTC", "SAR", units) - 60000 / 0.2666) < 1e-6);
  assert.equal(convertAmount(5, "XXX", "USD", units), null);
  assert.equal(convertAmount(-1, "USD", "BHD", units), null);
  assert.equal(convertAmount(NaN, "USD", "BHD", units), null);
  assert.equal(convertAmount(0, "USD", "BHD", units), 0);
  assert.equal(formatUnit(0.00123456789, units[3]), "0.00123457");
  assert.equal(formatUnit(12.5, units[0]), "12.50");
});

test("deposit limits", () => {
  const l = { min_minor: 5000, max_minor: 500000 };
  assert.equal(validateDeposit(5000, l), "ok");
  assert.equal(validateDeposit(4999, l), "min");
  assert.equal(validateDeposit(500001, l), "max");
  assert.equal(validateDeposit(0, l), "invalid");
  assert.equal(validateDeposit(12.5, l), "invalid");
});

test("card links: https only, encoded, known placeholders only", () => {
  const t = "https://ramp.example/?addr={address}&amt={amount_usd}&c={currency}&ref={ref}";
  assert.equal(buildOnrampUrl(t, { address: "TXyz&evil=1", amount_usd: "26.60", currency: "usdttrc20", ref: "ABC" }),
    "https://ramp.example/?addr=TXyz%26evil%3D1&amt=26.60&c=usdttrc20&ref=ABC");
  assert.equal(buildOnrampUrl("http://ramp.example/?a={address}", { address: "x" }), null);
  assert.equal(buildOnrampUrl("javascript:alert({address})", { address: "x" }), null);
  assert.equal(buildOnrampUrl("https://ramp.example/?a={secret}", { secret: "x" }), null);
  assert.equal(buildOnrampUrl("https://user:pw@ramp.example/?a={address}", { address: "x" }), null);
});

test("sign-up and login rules", () => {
  const ok = { email: " Sara@Example.com ", name: "سارة", phone: "+973 3333 4444", password: "correct-horse-1", password2: "correct-horse-1", accept: "on" };
  assert.deepEqual(parseRegister(ok), { ok: true, email: "sara@example.com", name: "سارة", phone: "+973 3333 4444", password: "correct-horse-1" });
  assert.equal(parseRegister({ ...ok, email: "nope" }).ok, false);
  assert.equal(parseRegister({ ...ok, password: "short", password2: "short" }).ok, false);
  assert.equal(parseRegister({ ...ok, password2: "different-pass-1" }).ok, false);
  assert.equal(parseRegister({ ...ok, accept: "" }).ok, false);
  assert.equal(parseRegister({ ...ok, phone: "abc" }).ok, false);
  assert.equal(passwordProblem("aaaaaaaaaaaa"), "كلمة المرور ضعيفة جداً.");
  assert.equal(passwordProblem("Sara@Example.com", "sara@example.com") !== null, true);
  assert.equal(parseLogin({ email: "a@b.co", password: "x" }).ok, true);
  assert.equal(parseLogin({ email: "bad", password: "x" }).ok, false);
  assert.equal(safeNext("/account/deposit"), "/account/deposit");
  assert.equal(safeNext("https://evil.example"), "/account");
  assert.equal(safeNext("//evil.example"), "/account");
  assert.equal(safeNext(undefined), "/account");
  assert.equal(safeNext("/order/ABCD2345WXYZ"), "/order/ABCD2345WXYZ");
  assert.equal(safeNext("/order/abc"), "/account");
  assert.equal(safeNext("/admin"), "/account");
});

test("crypto prices are read defensively", () => {
  const j = { tether: { usd: 1.0004 }, bitcoin: { usd: 61234.5 }, ethereum: { usd: "bad" }, binancecoin: {}, "usd-coin": { usd: -2 } };
  assert.deepEqual(parseCoinGecko(j), { USDT: 1.0004, BTC: 61234.5 });
  assert.deepEqual(parseCoinGecko(null), {});
  assert.deepEqual(parseCoinGecko("x"), {});
});
