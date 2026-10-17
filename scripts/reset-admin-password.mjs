import postgres from "postgres";
import { randomBytes, scrypt } from "node:crypto";

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const pw = process.env.ADMIN_PASSWORD || "";
if (pw.length < 12) { console.error("Password must be at least 12 characters."); process.exit(1); }

const salt = randomBytes(16);
const key = await new Promise((res, rej) => scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
const hash = `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const [u] = await sql`update admin_users set password_hash = ${hash} where email = ${email} returning id`;
if (!u) { console.error("No admin with that email."); await sql.end(); process.exit(1); }
await sql`delete from admin_sessions where admin_id = ${u.id}`;
console.log("Password updated and all sessions signed out for", email);
await sql.end();
