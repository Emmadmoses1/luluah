// Amounts are stored as integer minor units (fils for BHD: 1 BHD = 1000 fils).
export function formatBHD(minor: number | string): string {
  return new Intl.NumberFormat("ar-BH", {
    style: "currency",
    currency: "BHD",
    minimumFractionDigits: 3,
  }).format(Number(minor) / 1000);
}
