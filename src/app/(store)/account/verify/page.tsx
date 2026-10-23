import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import ActionForm from "@/components/account/ActionForm";
import { peekToken } from "@/lib/account-auth";
import { confirmEmail } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تأكيد البريد الإلكتروني", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = await peekToken(token, "verify");
  return (
    <>
      <PageHeader eyebrow="حسابي" title="تأكيد البريد الإلكتروني" />
      <main className="max-w-md mx-auto px-4 mt-10">
        {!valid ? (
          <p className="text-center py-10">الرابط غير صالح أو منتهي. <Link href="/account" className="underline font-bold">اطلب رابطاً جديداً من حسابك</Link></p>
        ) : (
          <div className="rounded-3xl border border-beige bg-white/70 p-6">
            <p className="text-sm mb-4">اضغط الزر لتأكيد بريدك الإلكتروني.</p>
            <ActionForm action={confirmEmail} submit="تأكيد بريدي" hidden={{ token }} fields={[]} />
          </div>
        )}
      </main>
    </>
  );
}
