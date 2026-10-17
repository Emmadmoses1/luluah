// Pure parsing helpers for GeoNames dumps (https://download.geonames.org/export/).
// Data licence: Creative Commons Attribution 4.0 — attribution is shown in the storefront footer.
const AR = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]/;

/** First alternate name written purely in Arabic script, or null. */
export function arabicName(alternates) {
  for (const n of (alternates ?? "").split(",")) {
    const t = n.trim();
    if (t && t.length <= 60 && AR.test(t) && !LATIN.test(t)) return t;
  }
  return null;
}

/** cities*.txt line -> row, or null. Only the countries in `allowed` (a Set of ISO2) are kept. */
export function parseCityLine(line, allowed) {
  const c = line.split("\t");
  if (c.length < 15) return null;
  const iso = c[8];
  if (!allowed.has(iso)) return null;
  const id = Number(c[0]);
  if (!Number.isSafeInteger(id) || !c[1]) return null;
  return {
    geoname_id: id, country_iso2: iso, name_en: c[2] || c[1], name_ar: arabicName(c[3]),
    admin_code: c[10] || null, population: Number(c[14]) || 0,
    lat: c[4] === "" ? null : Number(c[4]), lon: c[5] === "" ? null : Number(c[5]),
  };
}

/** Per-country postal file line -> row, or null. */
export function parsePostalLine(line, allowed) {
  const c = line.split("\t");
  if (c.length < 3) return null;
  const iso = c[0];
  const code = (c[1] ?? "").trim().toUpperCase();
  if (!allowed.has(iso) || !code || code.length > 20 || !c[2]) return null;
  return { country_iso2: iso, code, place_name: c[2].slice(0, 120), admin_name: (c[3] ?? "").slice(0, 120) || null };
}

/** admin1CodesASCII.txt -> Map("SA.01" -> "Ar Riyāḍ") */
export function parseAdmin1(text) {
  const m = new Map();
  for (const line of text.split("\n")) {
    const c = line.split("\t");
    if (c.length >= 2 && c[0]) m.set(c[0], c[1]);
  }
  return m;
}
