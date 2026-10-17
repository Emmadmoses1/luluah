import Link from "next/link";
import { listProducts, PAGE_SIZE } from "@/lib/catalog";
import { getDisplayCurrency } from "@/lib/currency-server";
import { parseBhd } from "@/lib/money";
import { westernDigits } from "@/lib/arabic";
import ProductCard from "./ProductCard";
import Reveal from "./Reveal";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").toString();
const field = "rounded-full border border-beige bg-white px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-4 focus:ring-gold/20 transition";

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
      <form method="get" action={basePath} className="rounded-3xl border border-beige bg-white/70 backdrop-blur p-4 md:p-5 flex flex-wrap items-end gap-3">
        {q && <input type="hidden" name="q" value={q} />}
        <label className="text-xs font-semibold">السعر من (د.ب)
          <input name="min" defaultValue={minRaw} inputMode="decimal" dir="ltr" className={`${field} block w-28 mt-1.5`} /></label>
        <label className="text-xs font-semibold">إلى
          <input name="max" defaultValue={maxRaw} inputMode="decimal" dir="ltr" className={`${field} block w-28 mt-1.5`} /></label>
        {res.sizes.length > 0 && (
          <label className="text-xs font-semibold">المقاس
            <select name="size" defaultValue={size} className={`${field} block mt-1.5`}>
              <option value="">الكل</option>
              {res.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select></label>
        )}
        {res.colors.length > 0 && (
          <label className="text-xs font-semibold">اللون
            <select name="color" defaultValue={color} className={`${field} block mt-1.5`}>
              <option value="">الكل</option>
              {res.colors.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
        )}
        <label className="text-xs font-semibold flex items-center gap-2 pb-3">
          <input type="checkbox" name="stock" value="1" defaultChecked={stock} className="accent-[#a8864a] w-4 h-4" /> المتوفر فقط</label>
        <label className="text-xs font-semibold">الترتيب
          <select name="sort" defaultValue={sort} className={`${field} block mt-1.5`}>
            <option value="new">الأحدث</option>
            <option value="price_asc">السعر: من الأقل</option>
            <option value="price_desc">السعر: من الأعلى</option>
            {res.hasPopular && <option value="popular">الأكثر مبيعاً</option>}
          </select></label>
        <button className="btn-dark !py-2.5 !px-6 text-sm">تطبيق</button>
        {(filtered || sort !== "new") && (
          <Link href={q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath} className="u-link text-sm pb-3">مسح الفلاتر</Link>
        )}
      </form>
      {(minRaw && min === null) || (maxRaw && max === null) ? (
        <p role="alert" className="mt-3 text-sm text-red-700">قيمة السعر غير صحيحة. استخدم أرقاماً مثل ١٢٫٥٠٠.</p>
      ) : null}
      <p className="mt-6 text-sm opacity-60">عدد المنتجات: {res.total.toLocaleString("ar")}</p>

      {res.products.length === 0 ? (
        <div className="py-24 text-center">
          <span className="text-4xl text-gold">✦</span>
          <p className="mt-4 font-display text-2xl font-bold">لا توجد منتجات مطابقة</p>
          <p className="mt-2 text-sm opacity-60">جرّب تعديل الفلاتر أو البحث بكلمة أخرى.</p>
          <Link href="/shop" className="btn-dark mt-6">تصفّح كل المنتجات</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6">
          {res.products.map((p, i) => <Reveal key={p.slug} delay={(i % 4) * 80}><ProductCard p={p} cur={cur} /></Reveal>)}
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-14 flex items-center justify-center gap-3 text-sm" aria-label="الصفحات">
          {page > 1 && <Link href={href(page - 1)} className="btn-ghost !text-ink !border-beige hover:!bg-ink hover:!text-gold !py-2 !px-5">→ السابق</Link>}
          <span className="px-3">صفحة {page.toLocaleString("ar")} من {pages.toLocaleString("ar")}</span>
          {page < pages && <Link href={href(page + 1)} className="btn-ghost !text-ink !border-beige hover:!bg-ink hover:!text-gold !py-2 !px-5">التالي ←</Link>}
        </nav>
      )}
    </div>
  );
}
