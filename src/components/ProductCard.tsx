import Link from "next/link";
import { BHD, formatMoney, type Cur } from "@/lib/currency";

export type CardProduct = {
  slug: string; name_ar: string; price_minor: string; sale_price_minor: string | null;
  image: string | null; in_stock?: boolean;
};

export default function ProductCard({ p, cur = BHD }: { p: CardProduct; cur?: Cur }) {
  const approx = cur.code !== "BHD" ? "≈ " : "";
  const out = p.in_stock === false;
  return (
    <Link href={`/product/${p.slug}`} className="group block">
      <div className="card-img aspect-[3/4] rounded-2xl group-hover:shadow-luxe transition-shadow duration-500 flex items-center justify-center text-5xl text-gold/60 font-bold">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name_ar} loading="lazy" className="w-full h-full object-cover" />
        ) : "ل"}
        {p.sale_price_minor !== null && !out && (
          <span className="absolute top-3 start-3 bg-ink text-gold text-xs font-bold px-3 py-1 rounded-full">خصم</span>
        )}
        {out && <span className="absolute inset-x-0 bottom-0 bg-ink/80 text-pearl text-xs text-center py-2">نفد المخزون</span>}
        {!out && (
          <span className="quick absolute inset-x-3 bottom-3 bg-ink/90 backdrop-blur text-gold text-sm font-bold text-center py-2.5 rounded-full">
            عرض التفاصيل
          </span>
        )}
      </div>
      <h3 className="mt-4 text-[15px] font-semibold leading-6 line-clamp-2 group-hover:text-goldDeep transition-colors">{p.name_ar}</h3>
      <p className="mt-1 text-sm">
        {p.sale_price_minor !== null ? (
          <>
            <span className="font-bold text-goldDeep">{approx}{formatMoney(p.sale_price_minor, cur)}</span>{" "}
            <span className="line-through opacity-45 text-xs">{formatMoney(p.price_minor, cur)}</span>
          </>
        ) : (
          <span className="font-bold">{approx}{formatMoney(p.price_minor, cur)}</span>
        )}
      </p>
    </Link>
  );
}
