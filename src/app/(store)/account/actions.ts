"use server";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { clientIp } from "@/lib/auth";
import {
  consumeToken, createAccountSession, createToken, currentToken, destroyAccountSession, destroyOtherSessions,
  getAccount, hashPassword, rateLimit, verifyPassword,
} from "@/lib/account-auth";
import { parseLogin, parseRegister, passwordProblem, safeNext } from "@/lib/account-forms";
import { sendEmail } from "@/lib/email";
import { emailConfigured, logEmail, siteUrl } from "@/lib/mailer";
import { resetPasswordEmail, verifyAccountEmail } from "@/lib/email-templates";
import { getWalletSettings } from "@/lib/wallet";
import { payOrderWithWallet } from "@/lib/wallet-pay";
import { newDepositRef } from "@/lib/deposits";
import { createDirectPayment, createInvoice } from "@/lib/payments/nowpayments";
import { bhdMinorToUsdCents } from "@/lib/payments/status";
import { parseBhd } from "@/lib/money";
import { westernDigits } from "@/lib/arabic";
import { buildOnrampUrl, validateDeposit } from "@/lib/converter";

type State = { error?: string; ok?: string } | undefined;
const obj = (fd: FormData) => Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)])) as Record<string, string>;
const DUMMY_HASH = "scrypt$" + "0".repeat(32) + "$" + "0".repeat(128);
const TOO_MANY = "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.";

async function sendVerification(accountId: string, email: string, name: string) {
  if (!emailConfigured()) return;
  const token = await createToken(accountId, "verify", 24);
  const m = verifyAccountEmail({ name, link: `${siteUrl()}/account/verify?token=${token}` });
  await logEmail(null, "verify", email, await sendEmail(email, m.subject, m.html));
}

export async function register(_p: State, fd: FormData): Promise<State> {
  if (!(await rateLimit(`reg:${await clientIp()}`, 8, 60))) return { error: TOO_MANY };
  const r = parseRegister(obj(fd));
  if (!r.ok) return { error: r.error };
  const hash = await hashPassword(r.password);
  let id = "";
  try {
    const [a] = await sql<{ id: string }[]>`
      insert into accounts (email, password_hash, full_name, phone) values (${r.email}, ${hash}, ${r.name}, ${r.phone}) returning id`;
    id = a.id;
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { error: "هذا البريد الإلكتروني مسجّل مسبقاً. جرّب تسجيل الدخول." };
    throw e;
  }
  await sql`insert into wallets (account_id) values (${id}) on conflict do nothing`;
  await sendVerification(id, r.email, r.name);
  await createAccountSession(id);
  redirect("/account");
}

export async function login(_p: State, fd: FormData): Promise<State> {
  const f = obj(fd);
  const r = parseLogin(f);
  if (!r.ok) return { error: r.error };
  const ip = await clientIp();
  if (!(await rateLimit(`login:ip:${ip}`, 30, 15)) || !(await rateLimit(`login:email:${r.email}`, 8, 15))) return { error: TOO_MANY };
  const [a] = await sql<{ id: string; password_hash: string }[]>`select id, password_hash from accounts where email = ${r.email}`;
  const ok = await verifyPassword(r.password, a?.password_hash ?? DUMMY_HASH);
  if (!a || !ok) return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  await sql`update accounts set last_login_at = now() where id = ${a.id}`;
  await createAccountSession(a.id);
  redirect(safeNext(f.next));
}

export async function logout() {
  await destroyAccountSession();
  redirect("/");
}

export async function resendVerification(_p: State): Promise<State> {
  const a = await getAccount();
  if (!a) return redirect("/account/login");
  if (a.verified) return { ok: "بريدك مؤكّد بالفعل." };
  if (!emailConfigured()) return { error: "خدمة البريد غير مفعّلة حالياً. تواصل معنا لتأكيد حسابك." };
  if (!(await rateLimit(`verify:${a.id}`, 3, 60))) return { error: TOO_MANY };
  await sendVerification(a.id, a.email, a.name);
  return { ok: "أرسلنا رابط التأكيد إلى بريدك الإلكتروني." };
}

export async function confirmEmail(_p: State, fd: FormData): Promise<State> {
  const id = await consumeToken(String(fd.get("token") ?? ""), "verify");
  if (!id) return { error: "الرابط غير صالح أو منتهي. اطلب رابطاً جديداً من صفحة حسابك." };
  await sql`update accounts set email_verified_at = coalesce(email_verified_at, now()) where id = ${id}`;
  redirect("/account?verified=1");
}

export async function forgotPassword(_p: State, fd: FormData): Promise<State> {
  const same: State = { ok: "إذا كان البريد مسجّلاً لدينا فقد أرسلنا إليه رابط إعادة التعيين." };
  const r = parseLogin({ email: String(fd.get("email") ?? ""), password: "x" });
  if (!r.ok) return same;
  if (!(await rateLimit(`forgot:ip:${await clientIp()}`, 6, 60)) || !(await rateLimit(`forgot:email:${r.email}`, 3, 60))) return { error: TOO_MANY };
  const [a] = await sql<{ id: string; full_name: string }[]>`select id, full_name from accounts where email = ${r.email}`;
  if (a && emailConfigured()) {
    const token = await createToken(a.id, "reset", 2);
    const m = resetPasswordEmail({ name: a.full_name, link: `${siteUrl()}/account/reset?token=${token}` });
    await logEmail(null, "reset", r.email, await sendEmail(r.email, m.subject, m.html));
  }
  return same;
}

export async function resetPassword(_p: State, fd: FormData): Promise<State> {
  const pw = String(fd.get("password") ?? "");
  const problem = passwordProblem(pw);
  if (problem) return { error: problem };
  if (pw !== String(fd.get("password2") ?? "")) return { error: "كلمتا المرور غير متطابقتين." };
  const id = await consumeToken(String(fd.get("token") ?? ""), "reset");
  if (!id) return { error: "الرابط غير صالح أو منتهي. اطلب رابطاً جديداً." };
  await sql`update accounts set password_hash = ${await hashPassword(pw)} where id = ${id}`;
  await destroyOtherSessions(id);
  redirect("/account/login?reset=1");
}

export async function updateProfile(_p: State, fd: FormData): Promise<State> {
  const a = await getAccount();
  if (!a) return redirect("/account/login");
  const name = String(fd.get("name") ?? "").trim();
  const phone = String(fd.get("phone") ?? "").trim();
  if (name.length < 2 || name.length > 80) return { error: "أدخل اسمك الكامل." };
  if (phone && !/^[+0-9 ()-]{5,25}$/.test(phone)) return { error: "رقم الهاتف غير صحيح." };
  await sql`update accounts set full_name = ${name}, phone = ${phone || null} where id = ${a.id}`;
  return { ok: "تم حفظ بياناتك." };
}

export async function changePassword(_p: State, fd: FormData): Promise<State> {
  const a = await getAccount();
  if (!a) return redirect("/account/login");
  if (!(await rateLimit(`chpw:${a.id}`, 6, 60))) return { error: TOO_MANY };
  const [row] = await sql<{ password_hash: string }[]>`select password_hash from accounts where id = ${a.id}`;
  if (!row || !(await verifyPassword(String(fd.get("current") ?? ""), row.password_hash))) return { error: "كلمة المرور الحالية غير صحيحة." };
  const pw = String(fd.get("password") ?? "");
  const problem = passwordProblem(pw, a.email);
  if (problem) return { error: problem };
  if (pw !== String(fd.get("password2") ?? "")) return { error: "كلمتا المرور غير متطابقتين." };
  await sql`update accounts set password_hash = ${await hashPassword(pw)} where id = ${a.id}`;
  await destroyOtherSessions(a.id, await currentToken());
  return { ok: "تم تغيير كلمة المرور وتسجيل الخروج من الأجهزة الأخرى." };
}

const trusted = (u: string) => { try { const x = new URL(u); return x.protocol === "https:" && x.hostname.endsWith("nowpayments.io"); } catch { return false; } };

export async function createDeposit(_p: State, fd: FormData): Promise<State> {
  const a = await getAccount();
  if (!a) return redirect("/account/login?next=/account/deposit");
  const ws = await getWalletSettings();
  if (!ws.enabled) return { error: "المحفظة غير متاحة حالياً." };
  if (a.blocked) return { error: "هذا الحساب موقوف. تواصل معنا." };
  if (!a.verified) return { error: "يرجى تأكيد بريدك الإلكتروني أولاً من صفحة حسابك." };
  if (!(await rateLimit(`dep:${a.id}`, 10, 60))) return { error: TOO_MANY };

  const minor = parseBhd(westernDigits(String(fd.get("amount") ?? "")).trim());
  if (minor === null) return { error: "أدخل مبلغاً صحيحاً بالدينار البحريني، مثال: ٢٥٫٥٠٠" };
  const v = validateDeposit(minor, ws);
  if (v === "min") return { error: `الحد الأدنى للإيداع ${(ws.min_minor / 1000).toFixed(3)} د.ب` };
  if (v === "max") return { error: `الحد الأقصى للإيداع الواحد ${(ws.max_minor / 1000).toFixed(3)} د.ب` };
  if (v !== "ok") return { error: "مبلغ غير صالح." };
  const [day] = await sql<{ s: string }[]>`
    select coalesce(sum(amount_minor), 0) as s from wallet_deposits
    where account_id = ${a.id} and created_at > now() - interval '24 hours' and status in ('unpaid','pending','confirming','paid','partially_paid')`;
  if (Number(day.s) + minor > ws.daily_max_minor) return { error: "تجاوزت الحد اليومي للإيداع. حاول غداً أو تواصل معنا." };

  const method = fd.get("method") === "card" ? "card" : "crypto";
  if (method === "card" && (!ws.card_enabled || !ws.card_url_template)) return { error: "الدفع بالبطاقة غير متاح حالياً." };
  if (!process.env.NOWPAYMENTS_API_KEY || !process.env.NOWPAYMENTS_IPN_SECRET) return { error: "الإيداع غير متاح حالياً." };

  const [usd] = await sql<{ rate_to_base: string | null }[]>`select rate_to_base from currencies where code = 'USD'`;
  const rate = usd?.rate_to_base ? Number(usd.rate_to_base) : 0;
  if (!(rate > 0)) return { error: "تعذّر تحديد سعر الصرف حالياً. حاول لاحقاً." };
  const amountUsd = (bhdMinorToUsdCents(minor, rate) / 100).toFixed(2);

  const ref = await newDepositRef();
  const [dep] = await sql<{ id: string }[]>`
    insert into wallet_deposits (ref, account_id, amount_minor, usd_amount, method) values (${ref}, ${a.id}, ${minor}, ${amountUsd}, ${method}) returning id`;
  const site = siteUrl();
  let redirectTo = "/account";
  try {
    if (method === "crypto") {
      const inv = await createInvoice({ amountUsd, orderRef: ref, description: `Luluah wallet deposit ${ref}`, siteUrl: site, returnPath: `/account/deposit/${ref}` });
      if (!inv?.invoice_url || !trusted(inv.invoice_url)) throw new Error("unexpected invoice response");
      await sql`update wallet_deposits set provider_invoice_id = ${String(inv.id)}, invoice_url = ${inv.invoice_url}, status = 'pending', updated_at = now() where id = ${dep.id}`;
      redirectTo = inv.invoice_url;
    } else {
      const p = await createDirectPayment({ amountUsd, orderRef: ref, payCurrency: ws.card_pay_currency, description: `Luluah wallet deposit ${ref}`, siteUrl: site });
      if (!p?.pay_address) throw new Error("unexpected payment response");
      await sql`update wallet_deposits set provider_payment_id = ${String(p.payment_id)}, pay_address = ${p.pay_address}, pay_currency = ${p.pay_currency},
        pay_amount = ${Number(p.pay_amount)}, status = 'pending', updated_at = now() where id = ${dep.id}`;
      redirectTo = `/account/deposit/${ref}`;
    }
  } catch (e) {
    console.error("[deposit]", e instanceof Error ? e.message : e);
    await sql`update wallet_deposits set status = 'failed', note = 'could not create the provider payment', updated_at = now() where id = ${dep.id}`;
    return { error: "تعذّر إنشاء عملية الإيداع. حاول مرة أخرى بعد قليل." };
  }
  return redirect(redirectTo);
}

export async function payOrder(_p: State, fd: FormData): Promise<State> {
  const ref = String(fd.get("ref") ?? "");
  if (!/^[A-Z2-9]{12}$/.test(ref)) return { error: "رقم الطلب غير صحيح." };
  const a = await getAccount();
  if (!a) return redirect(`/account/login?next=${encodeURIComponent("/order/" + ref)}`);
  const ws = await getWalletSettings();
  if (!ws.enabled) return { error: "المحفظة غير متاحة حالياً." };
  if (a.blocked) return { error: "هذا الحساب موقوف. تواصل معنا." };
  if (!a.verified) return { error: "يرجى تأكيد بريدك الإلكتروني أولاً." };
  if (!(await rateLimit(`pay:${a.id}`, 20, 60))) return { error: TOO_MANY };
  const r = await payOrderWithWallet(a.id, ref);
  if (!r.ok) return { error: r.error };
  return redirect(`/order/${ref}`);
}
