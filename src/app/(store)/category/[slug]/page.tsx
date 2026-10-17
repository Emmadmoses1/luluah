import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import Listing from "@/components/Listing";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getCat(slug: string) {
  const [c] = await sql<{ id: string; name_ar: string }[]>`
    select id, name_ar from categories where slug = ${slug} and is_active`;
  return c;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCat(slug);
  if (!c) return { title: "الصفحة غير موجودة" };
  return {
    title: c.name_ar,
    description: `تسوّقي ${c.name_ar} من لؤلؤة.`,
    alternates: { canonical: `/category/${slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const c = await getCat(slug);
  if (!c) notFound();
  return (
    <>
      <PageHeader eyebrow="الفئة" title={c.name_ar} />
      <main className="max-w-7xl mx-auto px-4 mt-10">
        <Listing basePath={`/category/${slug}`} sp={sp} catId={c.id} />
      </main>
    </>
  );
}
