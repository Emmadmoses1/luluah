const TONE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800", delivered: "bg-emerald-100 text-emerald-800", published: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800", confirming: "bg-amber-100 text-amber-800", processing: "bg-amber-100 text-amber-800",
  unpaid: "bg-neutral-200 text-neutral-700", new: "bg-sky-100 text-sky-800", draft: "bg-neutral-200 text-neutral-700",
  shipped: "bg-indigo-100 text-indigo-800", partially_paid: "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800", expired: "bg-red-100 text-red-800", cancelled: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800", archived: "bg-neutral-200 text-neutral-600",
};

export default function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TONE[value] ?? "bg-neutral-100 text-neutral-700"}`}>
      {value.replace("_", " ")}
    </span>
  );
}
