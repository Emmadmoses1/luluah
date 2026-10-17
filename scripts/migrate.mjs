import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url || url.includes("PASTE_")) {
  console.error("DATABASE_URL is missing. Edit .env first.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, onnotice: () => {} });
await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
const done = new Set((await sql`select name from schema_migrations`).map((r) => r.name));
const files = readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  if (done.has(f)) { console.log("skip   ", f); continue; }
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(`db/migrations/${f}`, "utf8"));
    await tx`insert into schema_migrations (name) values (${f})`;
  });
  console.log("applied", f);
}
await sql.end();
