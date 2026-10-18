export default function Field({ label, hint, children, className = "" }: {
  label: string; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="a-label">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {hint && <span className="mt-1 block text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}
