import type { Metadata } from "next";
import Listing from "@/components/Listing";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "كل المنتجات",
  description: "تصفّحي مجموعة لؤلؤة من الأزياء والعطور والإكسسوارات الفاخرة.",
  alternates: { canonical: "/shop" },
};

export default async function Shop({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader eyebrow="المتجر" title="كل المنتجات" sub="اكتشفي قطعاً مختارة بعناية تليق بذوقك." />
      <main className="max-w-7xl mx-auto px-4 mt-10"><Listing basePath="/shop" sp={sp} /></main>
    </>
  );
}
