import postgres from "postgres";
import { randomBytes, scrypt } from "node:crypto";

const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const pw = process.env.ADMIN_PASSWORD || "";
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { console.error("Invalid email."); process.exit(1); }
if (pw.length < 12) { console.error("Password must be at least 12 characters."); process.exit(1); }

const salt = randomBytes(16);
const key = await new Promise((res, rej) => scrypt(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
const hash = `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const [exists] = await sql`select 1 from admin_users where email = ${email}`;
if (exists) { console.error("That admin already exists."); await sql.end(); process.exit(1); }
await sql`insert into admin_users (email, password_hash, role) values (${email}, ${hash}, 'owner')`;
console.log("Owner account created for", email);
await sql.end();
