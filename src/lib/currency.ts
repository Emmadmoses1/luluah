// Display-only conversion. Orders are always priced and charged in BHD.
export type Cur = { code: string; decimals: number; rate: number }; // rate = units per 1 BHD
export const BHD: Cur = { code: "BHD", decimals: 3, rate: 1 };

export function formatMoney(minorBhd: number | string, cur: Cur = BHD): string {
  const bhd = Number(minorBhd) / 1000;
  return new Intl.NumberFormat("ar-BH", {
    style: "currency", currency: cur.code,
    minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals,
  }).format(bhd * cur.rate);
}
