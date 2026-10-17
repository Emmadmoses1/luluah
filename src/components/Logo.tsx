export function PearlMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="lp" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#f6ecd6" /><stop offset="1" stopColor="#b9965a" />
        </radialGradient>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3e3b8" /><stop offset="1" stopColor="#a8864a" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="none" stroke="url(#lg)" strokeWidth="1.4" />
      <circle cx="32" cy="32" r="24.5" fill="none" stroke="url(#lg)" strokeWidth=".6" strokeDasharray="1 3" />
      <circle cx="32" cy="32" r="17" fill="url(#lp)" />
      <ellipse cx="26" cy="25" rx="5" ry="3" fill="#fff" opacity=".7" transform="rotate(-30 26 25)" />
    </svg>
  );
}

export default function Logo({ light = false, size = 40 }: { light?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <PearlMark size={size} />
      <span className={`font-display font-bold leading-none ${light ? "gold-text" : "text-ink"}`} style={{ fontSize: size * 0.85 }}>لؤلؤة</span>
    </span>
  );
}
