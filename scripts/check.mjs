import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const [c] = await sql`select (select count(*) from categories) as cats, (select count(*) from products) as products`;
console.log("connected:", c);
await sql.end();
