import Link from "next/link";
import { getAccount } from "@/lib/account-auth";
import { getBalance, getWalletSettings } from "@/lib/wallet";
import { formatBHD } from "@/lib/money";
import WalletPayButton from "./WalletPayButton";

/** Shown on the order page while an order is unpaid. */
export default async function WalletPayPanel({ refCode, totalMinor, show }: { refCode: string; totalMinor: number; show: boolean }) {
  if (!show) return null;
  const ws = await getWalletSettings();
  if (!ws.enabled) return null;
  const a = await getAccount();
  const box = "mt-6 rounded-2xl border border-gold/50 bg-white/70 p-5 text-sm leading-7";
  if (!a) {
    return <div className={box}>لديك حساب؟ <Link href={`/account/login?next=${encodeURIComponent("/order/" + refCode)}`} className="underline font-bold">سجّل الدخول</Link> للدفع من رصيد محفظتك.</div>;
  }
  if (!a.verified) return <div className={box}>أكّد بريدك الإلكتروني من <Link href="/account" className="underline font-bold">صفحة حسابك</Link> لتتمكن من الدفع من المحفظة.</div>;
  const balance = await getBalance(a.id);
  if (balance >= totalMinor) {
    return (
      <div className={box}>
        <p>رصيدك الحالي <b>{formatBHD(balance)}</b>، وهو يكفي لهذا الطلب ({formatBHD(totalMinor)}).</p>
        <WalletPayButton refCode={refCode} />
      </div>
    );
  }
  return (
    <div className={box}>
      <p>رصيدك الحالي <b>{formatBHD(balance)}</b>، وهو أقل من إجمالي الطلب ({formatBHD(totalMinor)}).</p>
      <Link href="/account/deposit" className="btn-ghost !text-ink !border-gold mt-3">إيداع رصيد</Link>
    </div>
  );
}
