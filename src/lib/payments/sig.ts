import { createHmac, timingSafeEqual } from "node:crypto";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export function sortKeys(v: Json): Json {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === "object") {
    const out: { [k: string]: Json } = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }
  return v;
}

export function ipnSignature(payload: Json, secret: string): string {
  return createHmac("sha512", secret).update(JSON.stringify(sortKeys(payload))).digest("hex");
}

export function verifyIpn(payload: Json, header: string | null, secret: string): boolean {
  if (!secret || !header) return false;
  const expected = Buffer.from(ipnSignature(payload, secret), "utf8");
  const got = Buffer.from(header.trim().toLowerCase(), "utf8");
  return expected.length === got.length && timingSafeEqual(expected, got);
}
