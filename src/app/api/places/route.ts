import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { likeEscape, normAr, nsql, westernDigits } from "@/lib/arabic";

const CACHE = { "Cache-Control": "public, max-age=300" };
const NO_STORE = { "Cache-Control": "no-store" };

type Place = { name_ar: string | null; name_en: string; admin_name: string | null; iso2: string; country_ar: string };
const shape = (r: Place) => ({ name: r.name_ar ?? r.name_en, iso2: r.iso2, country_ar: r.country_ar, admin: r.admin_name });

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;

  // ---- Checkout location finder: searches every country that has delivery enabled ----
  if (u.get("scope") === "delivery") {
    if (u.has("lat") || u.has("lon")) {
      const lat = Number(u.get("lat")), lon = Number(u.get("lon"));
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return NextResponse.json({ places: [] }, { status: 400, headers: NO_STORE });
      }
      const rows = await sql<(Place & { km: number })[]>`
        select c.name_ar, c.name_en, c.admin_name, c.country_iso2 as iso2, k.name_ar as country_ar,
          6371 * 2 * asin(sqrt(
            power(sin(radians(c.lat - ${lat}::float8) / 2), 2) +
            cos(radians(${lat}::float8)) * cos(radians(c.lat)) * power(sin(radians(c.lon - ${lon}::float8) / 2), 2)
          )) as km
        from cities c join countries k on k.iso2 = c.country_iso2 and k.delivery_enabled
        where c.lat is not null and c.lon is not null
          and c.lat between ${lat}::float8 - 1.5 and ${lat}::float8 + 1.5
          and c.lon between ${lon}::float8 - 1.5 and ${lon}::float8 + 1.5
        order by km limit 1`;
      return NextResponse.json({ places: rows.filter((r) => r.km <= 150).map(shape) }, { headers: NO_STORE });
    }
    const q = (u.get("q") ?? "").trim().slice(0, 40);
    if (q.length < 2) return NextResponse.json({ places: [] }, { headers: CACHE });
    const norm = likeEscape(normAr(q));
    const like = `%${norm}%`, prefix = `${norm}%`;
    const rows = await sql<Place[]>`
      select c.name_ar, c.name_en, c.admin_name, c.country_iso2 as iso2, k.name_ar as country_ar
      from (select * from cities
            where country_iso2 in (select iso2 from countries where delivery_enabled)
              and (${nsql("name_ar")} like ${like} or lower(name_en) like ${like})) c
      join countries k on k.iso2 = c.country_iso2
      order by (case when ${nsql("c.name_ar")} like ${prefix} or lower(c.name_en) like ${prefix} then 0 else 1 end),
               c.population desc, c.name_en
      limit 8`;
    return NextResponse.json({ places: rows.map(shape) }, { headers: CACHE });
  }

  // ---- Suggestions inside one country (city field and postal-code lookup) ----
  const country = (u.get("country") ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ cities: [], postals: [] }, { status: 400 });

  const postal = westernDigits((u.get("postal") ?? "").trim()).toUpperCase().slice(0, 20);
  if (postal.length >= 2) {
    const postals = await sql<{ code: string; place_name: string; admin_name: string | null }[]>`
      select code, place_name, admin_name from postal_codes
      where country_iso2 = ${country} and code like ${likeEscape(postal) + "%"}
      order by code limit 8`;
    return NextResponse.json({ cities: [], postals }, { headers: CACHE });
  }

  const q = (u.get("q") ?? "").trim().slice(0, 40);
  if (q.length < 2) return NextResponse.json({ cities: [], postals: [] }, { headers: CACHE });
  const like = `%${likeEscape(normAr(q))}%`;
  const cities = await sql<{ name_ar: string | null; name_en: string; admin_name: string | null }[]>`
    select name_ar, name_en, admin_name from cities
    where country_iso2 = ${country} and (${nsql("name_ar")} like ${like} or lower(name_en) like ${like})
    order by population desc, name_en limit 8`;
  return NextResponse.json({ cities, postals: [] }, { headers: CACHE });
}
