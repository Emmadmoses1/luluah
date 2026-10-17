import postgres from "postgres";
import { scrypt } from "node:crypto";

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const pw = process.env.ADMIN_PASSWORD || "";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

const [u] = await sql`select password_hash from admin_users where email = ${email}`;
console.log("account exists:", Boolean(u));
if (u) {
  const [alg, salt, key] = u.password_hash.split("$");
  console.log("hash format ok:", alg === "scrypt" && salt?.length === 32 && key?.length === 128);
  const k = await new Promise((res, rej) => scrypt(pw, Buffer.from(salt, "hex"), 64, (e, d) => (e ? rej(e) : res(d))));
  console.log("password matches:", k.equals(Buffer.from(key, "hex")));
}
const [f] = await sql`select count(*) as n from login_attempts where ok = false and at > now() - interval '15 minutes'`;
console.log("failed logins in last 15 min:", f.n, "(5 means locked out)");
await sql.end();
