import { cookies } from "next/headers";
import { cache } from "react";
import { sql } from "./db";
import { BHD, type Cur } from "./currency";

export const COOKIE = "lu_cur";

export const activeCurrencies = cache(async (): Promise<(Cur & { name_en: string })[]> => {
  try {
    const rows = await sql<{ code: string; name_en: string; decimals: number; rate_to_base: string | null }[]>`
      select code, name_en, decimals, rate_to_base from currencies
      where is_active and rate_to_base is not null order by (code = 'BHD') desc, code`;
    const list = rows.map((r) => ({ code: r.code, name_en: r.name_en, decimals: r.decimals, rate: Number(r.rate_to_base) }));
    return list.some((c) => c.code === "BHD") ? list : [{ ...BHD, name_en: "Bahraini Dinar" }, ...list];
  } catch { return [{ ...BHD, name_en: "Bahraini Dinar" }]; }
});

export const getDisplayCurrency = cache(async (): Promise<Cur> => {
  const want = (await cookies()).get(COOKIE)?.value;
  const list = await activeCurrencies();
  return list.find((c) => c.code === want) ?? list[0] ?? BHD;
});
