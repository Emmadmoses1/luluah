// Maps GeoNames' (ASCII) Bahrain governorate names to the Arabic governorate list used at checkout.
export const BH_GOVERNORATES = ["محافظة العاصمة", "محافظة المحرق", "المحافظة الشمالية", "المحافظة الجنوبية"] as const;

export function bahrainRegion(admin: string | null | undefined): string | null {
  const a = (admin ?? "").toLowerCase();
  if (!a) return null;
  if (/manam|capital|asima/.test(a)) return BH_GOVERNORATES[0];
  if (/muhar/.test(a)) return BH_GOVERNORATES[1];
  if (/shamal|north/.test(a)) return BH_GOVERNORATES[2];
  if (/janub|south/.test(a)) return BH_GOVERNORATES[3];
  return null; // e.g. the dissolved Central governorate: let the customer choose
}
