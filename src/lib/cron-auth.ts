import { timingSafeEqual } from "node:crypto";

/** Accepts "Authorization: Bearer <secret>" only when a long enough secret is configured. */
export function isAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  const m = /^Bearer (.+)$/.exec(header);
  if (!m) return false;
  const a = Buffer.from(m[1]), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
