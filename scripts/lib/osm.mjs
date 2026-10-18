// OpenStreetMap postal data via the Overpass API. © OpenStreetMap contributors, ODbL 1.0.
// Coverage is community-driven and varies a lot by country: always review the result.
export function buildQuery(iso, limit = 60000) {
  if (!/^[A-Z]{2}$/.test(iso)) throw new Error("bad ISO code");
  return `[out:json][timeout:180];
area["ISO3166-1"="${iso}"][admin_level=2]->.a;
(
  nwr["addr:postcode"]["addr:city"](area.a);
  nwr["addr:postcode"]["addr:suburb"](area.a);
  rel["boundary"="postal_code"]["postal_code"]["name"](area.a);
);
out tags ${limit};`;
}

const toWestern = (s) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

/** Overpass JSON -> unique rows {country, code, place_name, admin_name}. */
export function elementsToRows(json, iso) {
  const seen = new Set(), rows = [];
  for (const el of json?.elements ?? []) {
    const t = el.tags ?? {};
    const raw = t["addr:postcode"] ?? t["postal_code"] ?? "";
    const code = toWestern(String(raw).split(";")[0]).replace(/\s+/g, "").toUpperCase();
    const place = (t["addr:city"] ?? t["addr:suburb"] ?? t["name"] ?? "").trim();
    if (!code || code.length > 12 || !place) continue;
    const key = `${code}|${place}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ country: iso, code, place_name: place, admin_name: (t["addr:state"] ?? t["addr:province"] ?? "").trim() });
  }
  return rows;
}

const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
export function toCsv(rows) {
  return ["country,code,place_name,admin_name", ...rows.map((r) => [r.country, r.code, q(r.place_name), q(r.admin_name)].join(","))].join("\n") + "\n";
}
