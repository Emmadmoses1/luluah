export type OrderPay = "unpaid" | "pending" | "confirming" | "paid" | "partially_paid" | "failed" | "expired" | "refunded";

export function mapProviderStatus(s: string): OrderPay | null {
  switch (s) {
    case "waiting": return "pending";
    case "confirming":
    case "confirmed":
    case "sending": return "confirming";
    case "finished": return "paid";
    case "partially_paid": return "partially_paid";
    case "failed": return "failed";
    case "expired": return "expired";
    case "refunded": return "refunded";
    default: return null;
  }
}

const RANK: Record<OrderPay, number> = {
  unpaid: 0, pending: 1, expired: 1, failed: 1, partially_paid: 2, confirming: 3, paid: 4, refunded: 5,
};

export function canTransition(from: OrderPay, to: OrderPay): boolean {
  if (from === to) return false;
  if (from === "refunded") return false;
  return RANK[to] > RANK[from];
}

export function bhdMinorToUsdCents(totalMinor: number, usdPerBhd: number): number {
  const cents = (totalMinor / 1000) * usdPerBhd * 100;
  return Math.ceil(cents - 1e-9);
}

export function amountMatches(expectedUsd: number, gotAmount: number, gotCurrency: string): boolean {
  return gotCurrency.toLowerCase() === "usd" && Math.abs(gotAmount - expectedUsd) <= 0.01;
}
