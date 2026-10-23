import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ActionForm from "@/components/account/ActionForm";
import { requireAccount } from "@/lib/account-auth";
import { changePassword, updateProfile } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إعدادات الحساب", robots: { index: false } };

export default async function SettingsPage() {
  const a = await requireAccount("/account/settings");
  const card = "rounded-3xl border border-beige bg-white/70 p-6";
  return (
    <>
      <PageHeader eyebrow="حسابي" title="إعدادات الحساب" />
      <main className="max-w-xl mx-auto px-4 mt-10 space-y-6">
        <section className={card}>
          <h2 className="font-display text-2xl font-bold mb-4">البيانات الشخصية</h2>
          <p className="text-sm opacity-70 mb-4">البريد الإلكتروني: <bdi dir="ltr">{a.email}</bdi></p>
          <ActionForm action={updateProfile} submit="حفظ"
            fields={[{ name: "name", label: "الاسم الكامل", required: true, defaultValue: a.name, autoComplete: "name" },
                     { name: "phone", label: "رقم الهاتف", type: "tel", dir: "ltr", defaultValue: a.phone ?? "", autoComplete: "tel" }]} />
        </section>
        <section className={card}>
          <h2 className="font-display text-2xl font-bold mb-4">تغيير كلمة المرور</h2>
          <ActionForm action={changePassword} submit="تغيير كلمة المرور"
            fields={[{ name: "current", label: "كلمة المرور الحالية", type: "password", required: true, autoComplete: "current-password" },
                     { name: "password", label: "كلمة المرور الجديدة", type: "password", required: true, autoComplete: "new-password" },
                     { name: "password2", label: "تأكيد كلمة المرور الجديدة", type: "password", required: true, autoComplete: "new-password" }]} />
        </section>
        <p className="text-center text-sm"><Link href="/account" className="underline">العودة إلى حسابي</Link></p>
      </main>
    </>
  );
}
