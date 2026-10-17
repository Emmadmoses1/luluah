import Link from "next/link";
import { formatBHD } from "@/lib/money";

export type CardProduct = {
  slug: string; name_ar: string; price_minor: string; sale_price_minor: string | null; image: string | null;
};

export default function ProductCard({ p }: { p: CardProduct }) {
  return (
    <Link href={`/product/${p.slug}`} className="group block">
      <div className="aspect-[3/4] bg-gradient-to-br from-pearl to-beige rounded-sm overflow-hidden flex items-center justify-center text-5xl text-gold/60 font-bold">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image} alt={p.name_ar} loading="lazy" className="w-full h-full object-cover" />
        ) : "ل"}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{p.name_ar}</h3>
      <p className="mt-1 text-sm">
        {p.sale_price_minor ? (
          <>
            <span className="font-bold">{formatBHD(p.sale_price_minor)}</span>{" "}
            <span className="line-through opacity-50">{formatBHD(p.price_minor)}</span>
          </>
        ) : (
          <span className="font-bold">{formatBHD(p.price_minor)}</span>
        )}
      </p>
    </Link>
  );
}
