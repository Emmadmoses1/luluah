import type { Metadata } from "next";
import Listing from "@/components/Listing";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "نتائج البحث", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? "").trim().slice(0, 80);
  return (
    <>
      <PageHeader eyebrow="البحث" title={q ? `نتائج البحث عن «${q}»` : "البحث"} />
      <main className="max-w-7xl mx-auto px-4 mt-10">
        {q ? <Listing basePath="/search" sp={sp} /> : <p className="py-20 text-center opacity-60">اكتبي كلمة للبحث عن منتج أو فئة.</p>}
      </main>
    </>
  );
}
