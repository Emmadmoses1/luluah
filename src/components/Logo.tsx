export function PearlMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="lp" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" /><stop offset=".55" stopColor="#f1e6d0" /><stop offset="1" stopColor="#c9a96e" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="19" fill="url(#lp)" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#c9a96e" strokeWidth="1.5" />
    </svg>
  );
}

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <PearlMark />
      <span className={`text-3xl font-bold leading-none ${light ? "text-gold" : "text-ink"}`}>لؤلؤة</span>
    </span>
  );
}
