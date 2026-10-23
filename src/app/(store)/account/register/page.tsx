import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ActionForm from "@/components/account/ActionForm";
import { getAccount } from "@/lib/account-auth";
import { getWalletSettings } from "@/lib/wallet";
import { register } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إنشاء حساب", robots: { index: false } };

export default async function RegisterPage() {
  if (await getAccount()) redirect("/account");
  const ws = await getWalletSettings();
  return (
    <>
      <PageHeader eyebrow="حسابي" title="إنشاء حساب" sub="احفظ بياناتك وتابع طلباتك وادفع من رصيد محفظتك." />
      <main className="max-w-md mx-auto px-4 mt-10">
        {!ws.enabled ? <p className="text-center py-10">الحسابات غير متاحة حالياً.</p> : (
          <div className="rounded-3xl border border-beige bg-white/70 p-6">
            <ActionForm action={register} submit="إنشاء الحساب"
              fields={[{ name: "name", label: "الاسم الكامل", required: true, autoComplete: "name" },
                       { name: "email", label: "البريد الإلكتروني", type: "email", dir: "ltr", required: true, autoComplete: "email" },
                       { name: "phone", label: "رقم الهاتف (اختياري)", type: "tel", dir: "ltr", autoComplete: "tel" },
                       { name: "password", label: "كلمة المرور", type: "password", required: true, autoComplete: "new-password", hint: "١٠ أحرف على الأقل." },
                       { name: "password2", label: "تأكيد كلمة المرور", type: "password", required: true, autoComplete: "new-password" },
                       { name: "accept", type: "checkbox", required: true, label: <>أوافق على <Link href="/terms" className="underline">الشروط والأحكام</Link> و<Link href="/privacy" className="underline">سياسة الخصوصية</Link></> }]}
              footer={<p className="text-sm text-center">لديك حساب؟ <Link className="underline" href="/account/login">تسجيل الدخول</Link></p>} />
          </div>
        )}
      </main>
    </>
  );
}
