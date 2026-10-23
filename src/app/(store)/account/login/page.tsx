import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ActionForm from "@/components/account/ActionForm";
import { getAccount } from "@/lib/account-auth";
import { safeNext } from "@/lib/account-forms";
import { getWalletSettings } from "@/lib/wallet";
import { login } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تسجيل الدخول", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const q = await searchParams;
  if (await getAccount()) redirect(safeNext(q.next));
  const ws = await getWalletSettings();
  return (
    <>
      <PageHeader eyebrow="حسابي" title="تسجيل الدخول" />
      <main className="max-w-md mx-auto px-4 mt-10">
        {!ws.enabled ? <p className="text-center py-10">الحسابات غير متاحة حالياً.</p> : (
          <div className="rounded-3xl border border-beige bg-white/70 p-6 space-y-4">
            {q.reset && <p role="status" className="rounded-xl bg-emerald-50 text-emerald-900 px-4 py-3 text-sm">تم تغيير كلمة المرور. سجّل الدخول بها.</p>}
            <ActionForm action={login} submit="دخول" hidden={{ next: q.next ?? "" }}
              fields={[{ name: "email", label: "البريد الإلكتروني", type: "email", dir: "ltr", autoComplete: "username", required: true },
                       { name: "password", label: "كلمة المرور", type: "password", autoComplete: "current-password", required: true }]}
              footer={<p className="text-sm text-center"><Link className="underline" href="/account/forgot">نسيت كلمة المرور؟</Link> · <Link className="underline" href="/account/register">إنشاء حساب</Link></p>} />
          </div>
        )}
      </main>
    </>
  );
}
