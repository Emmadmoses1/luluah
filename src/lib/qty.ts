// Order-quantity rules shared by the browser and the server.
export const HARD_MAX_QTY = 100000;

/**
 * Allowed quantity for one variant. If stock is lower than the minimum, the customer
 * may still buy whatever is left, so the last pieces can always be sold.
 */
export function limitsFor(stock: number, min: number, max: number): { min: number; max: number } {
  const hi = Math.max(0, Math.min(Math.floor(max), HARD_MAX_QTY, Math.floor(stock)));
  if (hi === 0) return { min: 0, max: 0 };
  return { min: Math.max(1, Math.min(Math.floor(min), hi)), max: hi };
}

export function clampQty(q: number, stock: number, min: number, max: number): number {
  const l = limitsFor(stock, min, max);
  if (l.max === 0) return 0;
  const n = Number.isFinite(q) ? Math.floor(q) : l.min;
  return Math.min(l.max, Math.max(l.min, n));
}
