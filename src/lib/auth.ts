import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { sql } from "./db";

const COOKIE = "lu_admin";
const SESSION_HOURS = 8;

export type Admin = { id: string; email: string; role: "owner" | "manager" | "staff"; mustChange: boolean };

function scrypt(pw: string, salt: Buffer): Promise<Buffer> {
  return new Promise((res, rej) => scryptCb(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))));
}
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, saltHex, keyHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !keyHex) return false;
  const key = await scrypt(pw, Buffer.from(saltHex, "hex"));
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export async function createSession(adminId: string) {
  await sql`delete from admin_sessions where expires_at < now()`;
  const token = randomBytes(32).toString("base64url");
  await sql`insert into admin_sessions (token_hash, admin_id, expires_at)
            values (${sha(token)}, ${adminId}, now() + make_interval(hours => ${SESSION_HOURS}))`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/admin", maxAge: SESSION_HOURS * 3600,
  });
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (token) await sql`delete from admin_sessions where token_hash = ${sha(token)}`;
  c.set(COOKIE, "", { path: "/admin", maxAge: 0 });
}

export async function getAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [a] = await sql<Admin[]>`
    select u.id, u.email, u.role, u.must_change_password as "mustChange"
    from admin_sessions s join admin_users u on u.id = s.admin_id
    where s.token_hash = ${sha(token)} and s.expires_at > now()`;
  return a ?? null;
}

export async function requireAdmin(roles?: Admin["role"][]): Promise<Admin> {
  const a = await getAdmin();
  if (!a) redirect("/admin/login");
  if (a.mustChange) redirect("/admin/change-password");
  if (roles && !roles.includes(a.role)) redirect("/admin?denied=1");
  return a;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
}

export async function audit(adminId: string | null, action: string, detail: Record<string, unknown> = {}) {
  await sql`insert into audit_logs (admin_id, action, detail)
            values (${adminId}, ${action}, ${sql.json(detail as never)})`;
}
