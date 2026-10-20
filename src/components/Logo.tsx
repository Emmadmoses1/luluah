export function PearlMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <defs>
        <radialGradient id="lu-pearl" cx=".34" cy=".28" r=".85">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".45" stopColor="#f7efdc" /><stop offset="1" stopColor="#b8975c" />
        </radialGradient>
        <linearGradient id="lu-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3e3b8" /><stop offset=".5" stopColor="#c9a96e" /><stop offset="1" stopColor="#8f6f35" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0c0a09" />
      <path d="M11 33 A21 21 0 0 0 53 33" fill="none" stroke="url(#lu-gold)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M17 35 A15 15 0 0 0 47 35" fill="none" stroke="url(#lu-gold)" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
      <circle cx="32" cy="34" r="11.5" fill="url(#lu-pearl)" />
      <ellipse cx="27.6" cy="29.6" rx="4" ry="2.4" fill="#fff" opacity=".8" transform="rotate(-32 27.6 29.6)" />
      <circle cx="32" cy="13" r="1.4" fill="#e3c88d" />
    </svg>
  );
}

export default function Logo({ light = false, size = 40, tagline = false }: { light?: boolean; size?: number; tagline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <PearlMark size={size} />
      <span className="flex flex-col leading-none">
        <span className={`font-display font-bold ${light ? "gold-text" : "text-ink"}`} style={{ fontSize: size * 0.9 }}>لؤلؤة</span>
        {tagline && <span className={`mt-1.5 text-[11px] tracking-wide ${light ? "text-gold/80" : "text-goldDeep"}`}>الفخامة التي تليق بك</span>}
      </span>
    </span>
  );
}
