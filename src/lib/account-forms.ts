// Validation for customer account forms (pure, so it can be tested).
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export type Err = { ok: false; error: string };

export function passwordProblem(pw: string, email = ""): string | null {
  if (pw.length < 10) return "كلمة المرور قصيرة: يجب أن تكون ١٠ أحرف على الأقل.";
  if (pw.length > 200) return "كلمة المرور طويلة جداً.";
  if (email && pw.toLowerCase() === email.toLowerCase()) return "لا تستخدم بريدك الإلكتروني ككلمة مرور.";
  if (/^(.)\1+$/.test(pw)) return "كلمة المرور ضعيفة جداً.";
  return null;
}

export function parseRegister(f: Record<string, string>):
  { ok: true; email: string; name: string; phone: string | null; password: string } | Err {
  const email = normalizeEmail(f.email ?? "");
  if (email.length > 120 || !EMAIL.test(email)) return { ok: false, error: "البريد الإلكتروني غير صحيح." };
  const name = (f.name ?? "").trim();
  if (name.length < 2 || name.length > 80) return { ok: false, error: "أدخل اسمك الكامل." };
  const phone = (f.phone ?? "").trim();
  if (phone && !/^[+0-9 ()-]{5,25}$/.test(phone)) return { ok: false, error: "رقم الهاتف غير صحيح." };
  const pw = f.password ?? "";
  const p = passwordProblem(pw, email);
  if (p) return { ok: false, error: p };
  if (pw !== (f.password2 ?? "")) return { ok: false, error: "كلمتا المرور غير متطابقتين." };
  if (f.accept !== "on") return { ok: false, error: "يجب الموافقة على الشروط والأحكام." };
  return { ok: true, email, name, phone: phone || null, password: pw };
}

export function parseLogin(f: Record<string, string>): { ok: true; email: string; password: string } | Err {
  const email = normalizeEmail(f.email ?? "");
  if (!EMAIL.test(email) || !f.password || f.password.length > 200) return { ok: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  return { ok: true, email, password: f.password };
}

/** Only the account area and order pages may be used as a redirect target after login. */
export function safeNext(next: string | undefined | null): string {
  return next && /^\/(account(\/[a-z0-9\-\/]*)?|order\/[A-Z2-9]{12})$/.test(next) ? next : "/account";
}
