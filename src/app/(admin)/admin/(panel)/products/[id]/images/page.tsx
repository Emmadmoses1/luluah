import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteProductImage, moveProductImage, uploadProductImage } from "@/app/(admin)/admin/manage-actions";

const MSG: Record<string, string> = {
  file: "Choose an image file.", size: "The image is larger than 4 MB. Resize it and try again.",
  type: "Only JPG, PNG or WebP images are accepted.", limit: "A product can have at most 12 images.", missing: "Product not found.",
};

export default async function ProductImages({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin(["owner", "manager"]);
  const { id } = await params;
  const q = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [p] = await sql<{ name_ar: string; sku: string }[]>`select name_ar, sku from products where id = ${id}`;
  if (!p) notFound();
  const imgs = await sql<{ id: string; path: string; thumb: string; alt_ar: string }[]>`
    select id, path, coalesce(thumb_path, path) as thumb, alt_ar from product_images where product_id = ${id} order by sort_order, id`;
  const btn = "a-btn-ghost !px-3 !py-1.5";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/admin/products/${id}`} className="text-sm text-[#a8864a] hover:underline">← Back to product</Link>
        <h1 className="mt-2 text-3xl font-semibold">Images</h1>
        <p className="text-sm text-neutral-500" dir="auto">{p.name_ar} <span className="font-mono">{p.sku}</span></p>
        <p className="text-sm text-neutral-600 mt-2">The first image is the main photo shown on cards and at the top of the product page.</p>
      </div>
      {q.saved && <p role="status" className="rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved.</p>}
      {q.error && <p role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{MSG[q.error] ?? "Could not save."}</p>}

      <form action={uploadProductImage} className="a-card p-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] items-end">
        <input type="hidden" name="id" value={id} />
        <label className="a-label">Image (JPG, PNG or WebP, max 4 MB)
          <input type="file" name="file" required accept="image/jpeg,image/png,image/webp" className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" />
        </label>
        <label className="a-label">Description (Arabic, optional)
          <input name="alt" dir="rtl" maxLength={200} className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" />
        </label>
        <button className="a-btn">Upload</button>
      </form>

      {imgs.length === 0 && <p className="text-sm text-neutral-500">No images yet. This product shows a placeholder on the storefront.</p>}
      <ul className="space-y-3">
        {imgs.map((im, i) => (
          <li key={im.id} className="a-card p-3 flex items-center gap-4">
            <span className="w-20 h-24 rounded-xl overflow-hidden bg-[#f5f2ec] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.thumb} alt={im.alt_ar} className="w-full h-full object-cover" />
            </span>
            <div className="flex-1 min-w-0 text-sm">
              <p className="font-semibold">{i === 0 ? "Main image" : `Image ${i + 1}`}</p>
              <p className="truncate text-neutral-500" dir="auto">{im.alt_ar}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              {i > 0 && (
                <form action={moveProductImage}><input type="hidden" name="id" value={id} /><input type="hidden" name="image" value={im.id} />
                  <button name="dir" value="up" className={btn} aria-label="Move earlier">↑</button></form>
              )}
              {i < imgs.length - 1 && (
                <form action={moveProductImage}><input type="hidden" name="id" value={id} /><input type="hidden" name="image" value={im.id} />
                  <button name="dir" value="down" className={btn} aria-label="Move later">↓</button></form>
              )}
              <form action={deleteProductImage}><input type="hidden" name="id" value={id} /><input type="hidden" name="image" value={im.id} />
                <button className={`${btn} !text-red-700`}>Delete</button></form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
