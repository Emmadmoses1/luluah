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
      <div className="relative aspect-[3/4] bg-gradient-to-br from-pearl to-beige overflow-hidden flex items-center justify-center text-5xl text-gold/60 font-bold">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name_ar} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : "ل"}
        {p.sale_price_minor !== null && !out && (
          <span className="absolute top-2 start-2 bg-ink text-gold text-xs px-2 py-1">خصم</span>
        )}
        {out && <span className="absolute inset-x-0 bottom-0 bg-ink/80 text-pearl text-xs text-center py-1.5">نفد المخزون</span>}
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-6">{p.name_ar}</h3>
      <p className="mt-1 text-sm">
        {p.sale_price_minor !== null ? (
          <>
            <span className="font-bold">{approx}{formatMoney(p.sale_price_minor, cur)}</span>{" "}
            <span className="line-through opacity-50">{formatMoney(p.price_minor, cur)}</span>
          </>
        ) : (
          <span className="font-bold">{approx}{formatMoney(p.price_minor, cur)}</span>
        )}
      </p>
    </Link>
  );
}
