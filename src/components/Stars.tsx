export default function Stars({ value }: { value: number }) {
  const n = Math.round(value);
  return (
    <span className="text-gold tracking-wider" role="img" aria-label={`${n.toLocaleString("ar")} من ٥`}>
      {"★".repeat(n)}<span className="opacity-30">{"★".repeat(5 - n)}</span>
    </span>
  );
}
