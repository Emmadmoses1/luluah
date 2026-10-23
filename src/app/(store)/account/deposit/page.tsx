import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import DepositForm from "@/components/account/DepositForm";
import { requireAccount } from "@/lib/account-auth";
import { getBalance, getWalletSettings } from "@/lib/wallet";
import { formatBHD } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إيداع رصيد", robots: { index: false } };

export default async function DepositPage() {
  const a = await requireAccount("/account/deposit");
  const ws = await getWalletSettings();
  const paymentsReady = Boolean(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET);
  const balance = await getBalance(a.id);
  return (
    <>
      <PageHeader eyebrow="المحفظة" title="إيداع رصيد" sub={`رصيدك الحالي ${formatBHD(balance)}`} />
      <main className="max-w-5xl mx-auto px-4 mt-10">
        {!ws.enabled || !paymentsReady ? <p className="text-center py-16">الإيداع غير متاح حالياً.</p>
          : !a.verified ? <p className="text-center py-16">أكّد بريدك الإلكتروني أولاً من <Link href="/account" className="underline font-bold">صفحة حسابك</Link>.</p>
          : a.blocked ? <p className="text-center py-16">هذا الحساب موقوف. تواصل معنا.</p>
          : <DepositForm minBhd={ws.min_minor / 1000} maxBhd={ws.max_minor / 1000} cardEnabled={ws.card_enabled && Boolean(ws.card_url_template)} />}
      </main>
    </>
  );
}
