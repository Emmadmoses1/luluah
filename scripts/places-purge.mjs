import postgres from "postgres";
const iso = (process.argv[2] ?? "").toUpperCase();
if (!/^[A-Z]{2}$/.test(iso)) { console.error("Usage: npm run places:purge -- XX   (deletes all imported postal codes for country XX)"); process.exit(1); }
const url = process.env.DATABASE_URL;
if (!url || url.includes("PASTE_")) { console.error("DATABASE_URL is missing. Edit .env first."); process.exit(1); }
const sql = postgres(url, { max: 1, onnotice: () => {} });
const r = await sql`delete from postal_codes where country_iso2 = ${iso}`;
console.log(`deleted ${r.count} postal code rows for ${iso}`);
await sql.end();
