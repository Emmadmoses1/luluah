import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteProductImage, moveProductImage, setSpin360, uploadProductImages } from "@/app/(admin)/admin/manage-actions";

const MSG: Record<string, string> = {
  file: "Choose at least one image file.", type: "Only JPG, PNG or WebP images are accepted.",
  limit: "A product can have at most 36 images.", missing: "Product not found.",
};

export default async function ProductImages({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string; added?: string; skipped?: string }>;
}) {
  await requireAdmin(["owner", "manager"]);
  const { id } = await params;
  const q = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [p] = await sql<{ name_ar: string; sku: string; spin_360: boolean }[]>`select name_ar, sku, spin_360 from products where id = ${id}`;
  if (!p) notFound();
  const imgs = await sql<{ id: string; path: string; thumb: string; alt_ar: string }[]>`
    select id, path, coalesce(thumb_path, path) as thumb, alt_ar from product_images where product_id = ${id} order by sort_order, id`;
  const btn = "a-btn-ghost !px-3 !py-1.5";
  const skipped = Number(q.skipped ?? 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/admin/products/${id}`} className="text-sm text-[#a8864a] hover:underline">← Back to product</Link>
        <h1 className="mt-2 text-3xl font-semibold">Images</h1>
        <p className="text-sm text-neutral-500" dir="auto">{p.name_ar} <span className="font-mono">{p.sku}</span></p>
        <p className="text-sm text-neutral-600 mt-2">The first image is the main photo. Customers can zoom every image, and can switch to a 3D tilt view. {imgs.length} of 36 images used.</p>
      </div>
      {q.saved && <p role="status" className="rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">
        Saved{q.added ? `: ${q.added} image(s) added` : ""}.{skipped > 0 ? ` ${skipped} file(s) were skipped (wrong type, over 4 MB, or over the 36-image limit).` : ""}</p>}
      {q.error && <p role="alert" className="rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{MSG[q.error] ?? "Could not save."}</p>}

      <form action={uploadProductImages} className="a-card p-5 space-y-4">
        <input type="hidden" name="id" value={id} />
        <label className="a-label block">Images (JPG, PNG or WebP, up to 4 MB each, many at once)
          <input type="file" name="file" multiple required accept="image/jpeg,image/png,image/webp" className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" />
        </label>
        <label className="a-label block">Description for all of them (Arabic, optional)
          <input name="alt" dir="rtl" maxLength={200} className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" />
        </label>
        <button className="a-btn">Upload</button>
        <p className="text-xs text-neutral-500">Tip: resize photos to about 1200 px wide before uploading. They are stored in your database, and smaller files make the store faster.</p>
      </form>

      <form action={setSpin360} className="a-card p-5 space-y-3">
        <input type="hidden" name="id" value={id} />
        <h2 className="font-semibold">360° view</h2>
        <p className="text-sm text-neutral-600">Turn this on only if the images are a turntable set: the same product photographed from around 24 to 36 evenly spaced angles, uploaded in order. Customers then get a drag-to-rotate viewer. It needs at least 8 images.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="spin" defaultChecked={p.spin_360} className="w-4 h-4 accent-[#a8864a]" /> These images are a 360° set</label>
        <button className="a-btn-ghost">Save</button>
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
