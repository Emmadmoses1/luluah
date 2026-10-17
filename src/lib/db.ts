import postgres from "postgres";
const g = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (process.env.NODE_ENV !== "production") {
    const u = new URL(url);
    console.log(`[db] connecting as ${u.username} @ ${u.host}`);
  }
  return postgres(url, { max: 5, prepare: false });
}

export const sql = g.__sql ?? (g.__sql = connect());
