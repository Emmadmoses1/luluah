import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ActionForm from "@/components/account/ActionForm";
import { forgotPassword } from "../actions";

export const metadata: Metadata = { title: "نسيت كلمة المرور", robots: { index: false } };

export default function ForgotPage() {
  return (
    <>
      <PageHeader eyebrow="حسابي" title="نسيت كلمة المرور" sub="أدخل بريدك وسنرسل لك رابط إعادة التعيين." />
      <main className="max-w-md mx-auto px-4 mt-10">
        <div className="rounded-3xl border border-beige bg-white/70 p-6">
          <ActionForm action={forgotPassword} submit="إرسال الرابط"
            fields={[{ name: "email", label: "البريد الإلكتروني", type: "email", dir: "ltr", required: true, autoComplete: "email" }]} />
        </div>
      </main>
    </>
  );
}
