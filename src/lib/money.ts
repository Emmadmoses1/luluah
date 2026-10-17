// Amounts are stored as integer minor units (fils for BHD: 1 BHD = 1000 fils).
export function formatBHD(minor: number | string): string {
  return new Intl.NumberFormat("ar-BH", {
    style: "currency",
    currency: "BHD",
    minimumFractionDigits: 3,
  }).format(Number(minor) / 1000);
}

// "12.500" -> 12500 minor units. Strings only, never floats.
export function parseBhd(s: string): number | null {
  const m = /^(\d{1,7})(?:\.(\d{1,3}))?$/.exec(s.trim());
  if (!m) return null;
  return Number(m[1]) * 1000 + Number((m[2] ?? "").padEnd(3, "0"));
}
