import postgres from "postgres";
import { existsSync, readFileSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { parseAdmin1, parseCityLine, parsePostalLine } from "./lib/geonames.mjs";

const url = process.env.DATABASE_URL;
if (!url || url.includes("PASTE_")) { console.error("DATABASE_URL is missing. Edit .env first."); process.exit(1); }
const sql = postgres(url, { max: 1, onnotice: () => {} });
const DIR = "data/geonames";

const countryRows = await sql`select iso2, postal_regex from countries`;
const isos = countryRows.map((r) => r.iso2);
const regexes = new Map(countryRows.filter((r) => r.postal_regex).map((r) => [r.iso2, new RegExp(r.postal_regex)]));
if (isos.length === 0) { console.error("No countries in the database. Run: npm run db:seed"); process.exit(1); }
const allowed = new Set(isos);

async function* lines(file) {
  const rl = createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  for await (const l of rl) if (l) yield l;
}
async function inChunks(rows, run) {
  for (let i = 0; i < rows.length; i += 1000) await run(rows.slice(i, i + 1000));
}

// ---- cities -------------------------------------------------------------
const cityFile = ["cities1000.txt", "cities5000.txt", "cities15000.txt"].map((f) => `${DIR}/${f}`).find(existsSync);
const admin1 = existsSync(`${DIR}/admin1CodesASCII.txt`) ? parseAdmin1(readFileSync(`${DIR}/admin1CodesASCII.txt`, "utf8")) : new Map();
if (cityFile) {
  const rows = [];
  for await (const l of lines(cityFile)) {
    const r = parseCityLine(l, allowed);
    if (!r) continue;
    rows.push({ geoname_id: r.geoname_id, country_iso2: r.country_iso2, name_en: r.name_en, name_ar: r.name_ar,
      admin_name: admin1.get(`${r.country_iso2}.${r.admin_code}`) ?? null, population: r.population, lat: r.lat, lon: r.lon });
  }
  await inChunks(rows, (c) => sql`
    insert into cities ${sql(c, "geoname_id", "country_iso2", "name_en", "name_ar", "admin_name", "population", "lat", "lon")}
    on conflict (geoname_id) do update set name_en = excluded.name_en, name_ar = excluded.name_ar,
      admin_name = excluded.admin_name, population = excluded.population`);
  console.log(`cities: ${rows.length} rows from ${cityFile} (${rows.filter((r) => r.name_ar).length} with an Arabic name)`);
} else console.log("cities: no cities*.txt found in data/geonames (run npm run places:fetch)");

// ---- postal codes -------------------------------------------------------
let totalPostal = 0;
const missing = [];
for (const iso of isos) {
  const f = `${DIR}/${iso}.txt`;
  if (!existsSync(f)) { missing.push(iso); continue; }
  const seen = new Set(), rows = [];
  let rejected = 0;
  for await (const l of lines(f)) {
    const r = parsePostalLine(l, allowed);
    if (!r) continue;
    const re = regexes.get(iso);
    if (re && !re.test(r.code)) { rejected++; continue; }
    const key = `${r.country_iso2}|${r.code}|${r.place_name}`;
    if (seen.has(key)) continue;
    seen.add(key); rows.push(r);
  }
  await inChunks(rows, (c) => sql`
    insert into postal_codes ${sql(c, "country_iso2", "code", "place_name", "admin_name")}
    on conflict (country_iso2, code, place_name) do nothing`);
  totalPostal += rows.length;
  console.log(`postal ${iso}: ${rows.length} rows` + (rejected ? ` (${rejected} rejected: wrong format)` : ""));
}
console.log(`postal codes total: ${totalPostal}`);
if (missing.length) console.log(`No postal file for: ${missing.join(", ")} (the source may not publish codes for these countries).`);
await sql.end();
