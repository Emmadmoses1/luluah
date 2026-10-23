"use client";
import { useActionState } from "react";
import { payOrder } from "@/app/(store)/account/actions";

export default function WalletPayButton({ refCode }: { refCode: string }) {
  const [state, run, pending] = useActionState(payOrder, undefined);
  return (
    <form action={run} className="mt-3">
      <input type="hidden" name="ref" value={refCode} />
      <button disabled={pending} className="btn-gold w-full disabled:opacity-60">{pending ? "جارٍ الدفع…" : "ادفع من رصيد المحفظة"}</button>
      {state?.error && <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
