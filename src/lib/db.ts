import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __sql?: Sql };

// Connects lazily, on the first real query, so builds work without a database.
function client(): Sql {
  if (g.__sql) return g.__sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (process.env.NODE_ENV !== "production") {
    const u = new URL(url);
    console.log(`[db] connecting as ${u.username} @ ${u.host}`);
  }
  return (g.__sql = postgres(url, { max: 5, prepare: false }));
}

export const sql = new Proxy(function () {} as unknown as Sql, {
  apply: (_t, _this, args) => (client() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_t, prop) => (client() as unknown as Record<string | symbol, unknown>)[prop],
}) as Sql;
