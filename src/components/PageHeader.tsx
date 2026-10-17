export default function PageHeader({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <section className="hero-bg grain relative overflow-hidden text-pearl">
      <div className="absolute -top-16 -start-16 w-56 h-56 rounded-full border border-gold/20 spin-slow" />
      <div className="absolute -bottom-20 -end-10 w-64 h-64 rounded-full border border-dashed border-gold/15 spin-slow-rev" />
      <div className="hero-in relative max-w-7xl mx-auto px-5 py-14 md:py-20 text-center">
        {eyebrow ? <p className="text-gold text-sm tracking-[.3em]">{eyebrow}</p> : <span />}
        <h1 className="mt-3 font-display text-4xl md:text-6xl font-bold gold-text leading-[1.3]">{title}</h1>
        {sub ? <p className="mt-3 opacity-75 max-w-xl mx-auto leading-8">{sub}</p> : <span />}
      </div>
    </section>
  );
}
