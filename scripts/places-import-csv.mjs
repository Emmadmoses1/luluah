import postgres from "postgres";
import { readFileSync } from "node:fs";
import { parsePostalCsv } from "./lib/postal-csv.mjs";

const file = process.argv[2];
if (!file) { console.error("Usage: npm run places:import-csv -- path/to/postal.csv"); process.exit(1); }
const url = process.env.DATABASE_URL;
if (!url || url.includes("PASTE_")) { console.error("DATABASE_URL is missing. Edit .env first."); process.exit(1); }
const sql = postgres(url, { max: 1, onnotice: () => {} });

const countries = await sql`select iso2, postal_regex from countries`;
const allowed = new Set(countries.map((c) => c.iso2));
const regexes = new Map(countries.filter((c) => c.postal_regex).map((c) => [c.iso2, c.postal_regex]));
const { rows, rejected, error } = parsePostalCsv(readFileSync(file, "utf8"), allowed, regexes);
if (error) { console.error(error); await sql.end(); process.exit(1); }
for (let i = 0; i < rows.length; i += 1000) {
  await sql`insert into postal_codes ${sql(rows.slice(i, i + 1000), "country_iso2", "code", "place_name", "admin_name")}
    on conflict (country_iso2, code, place_name) do nothing`;
}
console.log(`imported ${rows.length} rows from ${file}`);
if (rejected.length) {
  console.log(`rejected ${rejected.length} rows:`);
  rejected.slice(0, 15).forEach((r) => console.log(`  line ${r.line}: ${r.reason}`));
  if (rejected.length > 15) console.log(`  …and ${rejected.length - 15} more`);
}
await sql.end();
