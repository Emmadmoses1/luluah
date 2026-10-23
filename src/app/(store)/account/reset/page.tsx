import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ActionForm from "@/components/account/ActionForm";
import { peekToken } from "@/lib/account-auth";
import { resetPassword } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "كلمة مرور جديدة", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = await peekToken(token, "reset");
  return (
    <>
      <PageHeader eyebrow="حسابي" title="كلمة مرور جديدة" />
      <main className="max-w-md mx-auto px-4 mt-10">
        {!valid ? (
          <p className="text-center py-10">الرابط غير صالح أو منتهي. <Link href="/account/forgot" className="underline font-bold">اطلب رابطاً جديداً</Link></p>
        ) : (
          <div className="rounded-3xl border border-beige bg-white/70 p-6">
            <ActionForm action={resetPassword} submit="حفظ كلمة المرور" hidden={{ token }}
              fields={[{ name: "password", label: "كلمة المرور الجديدة", type: "password", required: true, autoComplete: "new-password", hint: "١٠ أحرف على الأقل." },
                       { name: "password2", label: "تأكيد كلمة المرور", type: "password", required: true, autoComplete: "new-password" }]} />
          </div>
        )}
      </main>
    </>
  );
}
