export type DiscountRow = {
  id: string; code: string; kind: "percent" | "fixed"; value: number; min_order_minor: string;
  max_uses: number | null; used_count: number; starts_at: Date | null; ends_at: Date | null; is_active: boolean;
};
export type DiscountResult = { ok: true; id: string; code: string; amountMinor: number } | { ok: false; error: string };

export const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);

export function evaluateDiscount(d: DiscountRow | undefined, subtotalMinor: number, now = new Date()): DiscountResult {
  if (!d || !d.is_active) return { ok: false, error: "رمز الخصم غير صالح." };
  if (d.starts_at && d.starts_at > now) return { ok: false, error: "رمز الخصم غير صالح حالياً." };
  if (d.ends_at && d.ends_at < now) return { ok: false, error: "انتهت صلاحية رمز الخصم." };
  if (d.max_uses !== null && d.used_count >= d.max_uses) return { ok: false, error: "تم استخدام رمز الخصم بالكامل." };
  if (subtotalMinor < Number(d.min_order_minor)) return { ok: false, error: "قيمة الطلب أقل من الحد الأدنى لاستخدام هذا الرمز." };
  const raw = d.kind === "percent" ? Math.floor((subtotalMinor * d.value) / 100) : d.value;
  return { ok: true, id: d.id, code: d.code, amountMinor: Math.min(raw, subtotalMinor) };
}
