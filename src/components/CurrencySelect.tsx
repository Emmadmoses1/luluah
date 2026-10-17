"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCurrency } from "@/app/(store)/actions";

export default function CurrencySelect({ codes, current }: { codes: string[]; current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (codes.length < 2) return null;
  return (
    <select aria-label="عملة العرض" value={current} disabled={pending} dir="ltr"
      onChange={(e) => start(async () => { await setCurrency(e.target.value); router.refresh(); })}
      className="border border-beige bg-white text-xs px-2 py-1.5">
      {codes.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}
