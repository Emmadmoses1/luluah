import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
export { hashPassword, verifyPassword } from "@/lib/auth";

const COOKIE = "lu_acct";
const SESSION_DAYS = 30;
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export type Account = { id: string; email: string; name: string; phone: string | null; verified: boolean; blocked: boolean };

export async function createAccountSession(accountId: string) {
  await sql`delete from account_sessions where expires_at < now()`;
  const token = randomBytes(32).toString("base64url");
  await sql`insert into account_sessions (token_hash, account_id, expires_at)
            values (${sha(token)}, ${accountId}, now() + make_interval(days => ${SESSION_DAYS}))`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroyAccountSession() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (token) await sql`delete from account_sessions where token_hash = ${sha(token)}`;
  c.set(COOKIE, "", { path: "/", maxAge: 0 });
}

/** Signs out every other device of this account (used after a password change or reset). */
export async function destroyOtherSessions(accountId: string, keepToken?: string) {
  if (keepToken) await sql`delete from account_sessions where account_id = ${accountId} and token_hash <> ${sha(keepToken)}`;
  else await sql`delete from account_sessions where account_id = ${accountId}`;
}
export async function currentToken(): Promise<string | undefined> { return (await cookies()).get(COOKIE)?.value; }

export const getAccount = cache(async (): Promise<Account | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [a] = await sql<Account[]>`
    select a.id, a.email, a.full_name as name, a.phone, (a.email_verified_at is not null) as verified, (a.status = 'blocked') as blocked
    from account_sessions s join accounts a on a.id = s.account_id
    where s.token_hash = ${sha(token)} and s.expires_at > now()`;
  return a ?? null;
});

export async function requireAccount(next = "/account"): Promise<Account> {
  const a = await getAccount();
  if (!a) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return a;
}

/** One-time links for email verification and password reset. Only a hash of the token is stored. */
export async function createToken(accountId: string, kind: "verify" | "reset", hours: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await sql`insert into account_tokens (token_hash, account_id, kind, expires_at)
            values (${sha(token)}, ${accountId}, ${kind}, now() + make_interval(hours => ${hours}))`;
  return token;
}
export async function consumeToken(token: string, kind: "verify" | "reset"): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  const [r] = await sql<{ account_id: string }[]>`
    update account_tokens set used_at = now()
    where token_hash = ${sha(token)} and kind = ${kind} and used_at is null and expires_at > now() returning account_id`;
  return r?.account_id ?? null;
}
export async function peekToken(token: string, kind: "verify" | "reset"): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return false;
  const [r] = await sql`select 1 as x from account_tokens where token_hash = ${sha(token)} and kind = ${kind} and used_at is null and expires_at > now()`;
  return Boolean(r);
}

/** Returns true while the caller is under the limit for this key. */
export async function rateLimit(key: string, max: number, windowMinutes: number): Promise<boolean> {
  const [r] = await sql<{ n: number }[]>`
    insert into rate_limits (key, window_start, n) values (${key}, now(), 1)
    on conflict (key) do update set
      n = case when rate_limits.window_start < now() - make_interval(mins => ${windowMinutes}) then 1 else rate_limits.n + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(mins => ${windowMinutes}) then now() else rate_limits.window_start end
    returning n`;
  return r.n <= max;
}
