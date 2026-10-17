import Link from "next/link";
import { listProducts, PAGE_SIZE } from "@/lib/catalog";
import { getDisplayCurrency } from "@/lib/currency-server";
import { parseBhd } from "@/lib/money";
import { westernDigits } from "@/lib/arabic";
import ProductCard from "./ProductCard";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").toString();
const field = "border border-beige bg-white px-2 py-2 text-sm";

export default async function Listing({ basePath, sp, catId }: { basePath: string; sp: SP; catId?: string }) {
  const q = one(sp.q).trim().slice(0, 80);
  const minRaw = westernDigits(one(sp.min)).trim();
  const maxRaw = westernDigits(one(sp.max)).trim();
  const min = minRaw ? parseBhd(minRaw) : null;
  const max = maxRaw ? parseBhd(maxRaw) : null;
  const size = one(sp.size).slice(0, 40);
  const color = one(sp.color).slice(0, 40);
  const stock = one(sp.stock) === "1";
  const sort = ["new", "price_asc", "price_desc", "popular"].includes(one(sp.sort)) ? one(sp.sort) : "new";
  const page = Math.max(1, Math.min(200, Number(westernDigits(one(sp.page))) || 1));

  const [res, cur] = await Promise.all([
    listProducts({ q, cat: catId, min, max, size, color, stock, sort, page }),
    getDisplayCurrency(),
  ]);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (minRaw) params.set("min", minRaw);
  if (maxRaw) params.set("max", maxRaw);
  if (size) params.set("size", size);
  if (color) params.set("color", color);
  if (stock) params.set("stock", "1");
  if (sort !== "new") params.set("sort", sort);
  const href = (p: number) => {
    const x = new URLSearchParams(params);
    if (p > 1) x.set("page", String(p));
    const s = x.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const pages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
  const filtered = Boolean(minRaw || maxRaw || size || color || stock);

  return (
    <div>
      <form method="get" action={basePath} className="flex flex-wrap items-end gap-3 border-y border-beige py-4">
        {q && <input type="hidden" name="q" value={q} />}
        <label className="text-xs">السعر من (د.ب)
          <input name="min" defaultValue={minRaw} inputMode="decimal" dir="ltr" className={`${field} block w-24 mt-1`} /></label>
        <label className="text-xs">إلى
          <input name="max" defaultValue={maxRaw} inputMode="decimal" dir="ltr" className={`${field} block w-24 mt-1`} /></label>
        {res.sizes.length > 0 && (
          <label className="text-xs">المقاس
            <select name="size" defaultValue={size} className={`${field} block mt-1`}>
              <option value="">الكل</option>
              {res.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select></label>
        )}
        {res.colors.length > 0 && (
          <label className="text-xs">اللون
            <select name="color" defaultValue={color} className={`${field} block mt-1`}>
              <option value="">الكل</option>
              {res.colors.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
        )}
        <label className="text-xs flex items-center gap-2 pb-2">
          <input type="checkbox" name="stock" value="1" defaultChecked={stock} /> المتوفر فقط</label>
        <label className="text-xs">الترتيب
          <select name="sort" defaultValue={sort} className={`${field} block mt-1`}>
            <option value="new">الأحدث</option>
            <option value="price_asc">السعر: من الأقل</option>
            <option value="price_desc">السعر: من الأعلى</option>
            {res.hasPopular && <option value="popular">الأكثر مبيعاً</option>}
          </select></label>
        <button className="bg-ink text-gold px-5 py-2 text-sm font-semibold">تطبيق</button>
        {(filtered || sort !== "new") && (
          <Link href={q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath} className="text-sm underline pb-2">مسح الفلاتر</Link>
        )}
      </form>
      {(minRaw && min === null) || (maxRaw && max === null) ? (
        <p className="mt-3 text-sm text-red-700">قيمة السعر غير صحيحة. استخدم أرقاماً مثل ١٢٫٥٠٠.</p>
      ) : null}
      <p className="mt-4 text-sm opacity-60">عدد المنتجات: {res.total.toLocaleString("ar")}</p>

      {res.products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-semibold">لا توجد منتجات مطابقة</p>
          <p className="mt-2 text-sm opacity-60">جرّب تعديل الفلاتر أو البحث بكلمة أخرى.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
          {res.products.map((p) => <ProductCard key={p.slug} p={p} cur={cur} />)}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-12 flex items-center justify-center gap-2 text-sm" aria-label="الصفحات">
          {page > 1 && <Link href={href(page - 1)} className="border border-beige px-4 py-2">السابق</Link>}
          <span className="px-3">صفحة {page.toLocaleString("ar")} من {pages.toLocaleString("ar")}</span>
          {page < pages && <Link href={href(page + 1)} className="border border-beige px-4 py-2">التالي</Link>}
        </nav>
      )}
    </div>
  );
}
