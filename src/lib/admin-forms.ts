// Pure helpers for admin forms and exports (no imports, so they are easy to test).

/** One CSV cell. Cells starting with = + - @ are prefixed with ' so spreadsheets never run them as formulas. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const toCsv = (rows: unknown[][]): string => rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const validDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && isoDay(new Date(s + "T00:00:00Z")) === s;

/** Defaults to the last 30 days (UTC). Max span 366 days. */
export function parseDateRange(from: string | undefined, to: string | undefined, today = new Date()): { from: string; to: string; error: string | null } {
  const end = to && validDay(to) ? to : isoDay(today);
  const start = from && validDay(from) ? from : isoDay(new Date(new Date(end + "T00:00:00Z").getTime() - 29 * 86400000));
  if (start > end) return { from: start, to: end, error: "The start date must not be after the end date." };
  if ((new Date(end).getTime() - new Date(start).getTime()) / 86400000 > 366) return { from: start, to: end, error: "The range can be at most 366 days." };
  return { from: start, to: end, error: null };
}

const bhdToMinor = (s: string): number | null => {
  const m = /^(\d{1,7})(?:\.(\d{1,3}))?$/.exec(s.trim());
  return m ? Number(m[1]) * 1000 + Number((m[2] ?? "").padEnd(3, "0")) : null;
};

export type DiscountInput = { code: string; kind: "percent" | "fixed"; value: number; min_order_minor: number;
  max_uses: number | null; starts_at: string | null; ends_at: string | null };

/** Validates the admin discount form. fixed values are entered in BHD and stored as fils. */
export function parseDiscount(f: Record<string, string>): { ok: true; d: DiscountInput } | { ok: false; error: string } {
  const code = (f.code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return { ok: false, error: "code" };
  const kind = f.kind;
  if (kind !== "percent" && kind !== "fixed") return { ok: false, error: "kind" };
  let value: number;
  if (kind === "percent") {
    if (!/^\d{1,3}$/.test((f.value ?? "").trim())) return { ok: false, error: "value" };
    value = Number(f.value);
    if (value < 1 || value > 100) return { ok: false, error: "value" };
  } else {
    const m = bhdToMinor(f.value ?? "");
    if (m === null || m <= 0) return { ok: false, error: "value" };
    value = m;
  }
  const minRaw = (f.min_order ?? "").trim();
  const min = minRaw === "" ? 0 : bhdToMinor(minRaw);
  if (min === null) return { ok: false, error: "min" };
  const usesRaw = (f.max_uses ?? "").trim();
  let max_uses: number | null = null;
  if (usesRaw !== "") {
    if (!/^\d{1,6}$/.test(usesRaw) || Number(usesRaw) < 1) return { ok: false, error: "uses" };
    max_uses = Number(usesRaw);
  }
  const s = (f.starts ?? "").trim(), e = (f.ends ?? "").trim();
  if ((s && !validDay(s)) || (e && !validDay(e))) return { ok: false, error: "dates" };
  if (s && e && s > e) return { ok: false, error: "dates" };
  return { ok: true, d: { code, kind, value, min_order_minor: min, max_uses,
    starts_at: s ? `${s}T00:00:00Z` : null, ends_at: e ? `${e}T23:59:59Z` : null } };
}

/** Exchange rate = units of the currency per 1 BHD. Returns the normalised string or null. */
export function parseRate(s: string): string | null {
  const t = s.trim();
  if (!/^\d{1,6}(\.\d{1,8})?$/.test(t)) return null;
  return Number(t) > 0 ? t : null;
}

/** Stock adjustment: a non-zero whole number, e.g. "+5", "-2", "10". */
export function parseDelta(s: string): number | null {
  const t = s.trim().replace(/^\+/, "");
  if (!/^-?\d{1,6}$/.test(t)) return null;
  const n = Number(t);
  return n === 0 ? null : n;
}

/** New admin account: validated email, role and a temporary password of at least 12 characters. */
export function parseAdminUser(f: { email?: string; role?: string; password?: string }):
  { ok: true; email: string; role: "owner" | "manager" | "staff"; password: string } | { ok: false; error: string } {
  const email = (f.email ?? "").trim().toLowerCase();
  if (email.length > 120 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "email" };
  if (f.role !== "owner" && f.role !== "manager" && f.role !== "staff") return { ok: false, error: "role" };
  const password = f.password ?? "";
  if (password.length < 12 || password.length > 200) return { ok: false, error: "password" };
  return { ok: true, email, role: f.role, password };
}
