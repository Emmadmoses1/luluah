import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { likeEscape, normAr, nsql, westernDigits } from "@/lib/arabic";

const HEADERS = { "Cache-Control": "public, max-age=300" };

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const country = (u.get("country") ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ cities: [], postals: [] }, { status: 400 });

  const postal = westernDigits((u.get("postal") ?? "").trim()).toUpperCase().slice(0, 20);
  if (postal.length >= 2) {
    const postals = await sql<{ code: string; place_name: string; admin_name: string | null }[]>`
      select code, place_name, admin_name from postal_codes
      where country_iso2 = ${country} and code like ${likeEscape(postal) + "%"}
      order by code limit 8`;
    return NextResponse.json({ cities: [], postals }, { headers: HEADERS });
  }

  const q = (u.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 2) return NextResponse.json({ cities: [], postals: [] }, { headers: HEADERS });
  const like = `%${likeEscape(normAr(q))}%`;
  const cities = await sql<{ name_ar: string | null; name_en: string; admin_name: string | null }[]>`
    select name_ar, name_en, admin_name from cities
    where country_iso2 = ${country} and (${nsql("name_ar")} like ${like} or lower(name_en) like ${like})
    order by population desc, name_en limit 8`;
  return NextResponse.json({ cities, postals: [] }, { headers: HEADERS });
}
