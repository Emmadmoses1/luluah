export type ShipRule = { fee_minor: number; free_over_minor: number | null };

export function shippingFor(c: ShipRule, subtotalMinor: number): number {
  return c.free_over_minor !== null && subtotalMinor >= c.free_over_minor ? 0 : c.fee_minor;
}

export const BH_REGIONS = ["محافظة العاصمة", "محافظة المحرق", "المحافظة الشمالية", "المحافظة الجنوبية"];
