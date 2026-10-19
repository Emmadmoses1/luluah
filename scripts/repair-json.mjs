import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url || url.includes("PASTE_")) { console.error("DATABASE_URL is missing. Edit .env first."); process.exit(1); }
const sql = postgres(url, { max: 1, onnotice: () => {} });

// Earlier versions saved some JSON as a quoted text string instead of real structured data.
// This turns those values back into real JSON. Rows that are already correct are not touched.
const targets = [["store_settings", "value"], ["orders", "address"], ["payment_events", "payload"], ["audit_logs", "detail"]];
let total = 0;
for (const [table, col] of targets) {
  try {
    const r = await sql`update ${sql(table)} set ${sql(col)} = (${sql(col)} #>> '{}')::jsonb
      where jsonb_typeof(${sql(col)}) = 'string' and (${sql(col)} #>> '{}') ~ '^[[:space:]]*[[{]'`;
    console.log(`${table}.${col}: repaired ${r.count} row(s)`);
    total += r.count;
  } catch (e) {
    console.error(`${table}.${col}: could not repair (${e.message})`);
  }
}
console.log(total === 0 ? "Nothing needed repair." : `Done: ${total} row(s) repaired.`);
await sql.end();
