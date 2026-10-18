import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createDiscount, deleteDiscount, toggleDiscount } from "@/app/(admin)/admin/ops-actions";
import Field from "@/components/admin/Field";

const MSG: Record<string, string> = {
  code: "Code must be 3-32 characters: English letters, numbers, - or _.",
  kind: "Choose a discount type.", value: "Percent must be 1-100. A fixed amount must be greater than 0 (BHD, up to 3 decimals).",
  min: "Minimum order must be a BHD amount.", uses: "Max uses must be a whole number of 1 or more.",
  dates: "Check the dates: valid days, and the start must not be after the end.",
  duplicate: "That code already exists.", used: "A code that has been used cannot be deleted. Disable it instead.",
};
const bhd = (m: string) => (Number(m) / 1000).toFixed(3);

export default async function Discounts({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const q = await searchParams;
  const rows = await sql<{ id: string; code: string; kind: string; value: number; min_order_minor: string; max_uses: number | null;
    used_count: number; starts_at: Date | null; ends_at: Date | null; is_active: boolean }[]>`
    select id, code, kind, value, min_order_minor, max_uses, used_count, starts_at, ends_at, is_active
    from discounts order by created_at desc`;
  const now = new Date();
  const state = (d: (typeof rows)[number]) =>
    !d.is_active ? "Disabled" : d.starts_at && d.starts_at > now ? "Scheduled" : d.ends_at && d.ends_at < now ? "Expired"
    : d.max_uses !== null && d.used_count >= d.max_uses ? "Used up" : "Live";
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Marketing</p>
        <h1 className="text-3xl font-semibold mt-1">Discount codes</h1>
      </div>
      {q.saved && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Saved.</p>}
      {q.error && <p role="alert" className="mb-4 rounded-xl bg-red-100 text-red-900 px-4 py-3 text-sm">{MSG[q.error] ?? "Could not save."}</p>}

      <form action={createDiscount} className="a-card p-5 mb-6 grid gap-4 md:grid-cols-4 items-end">
        <Field label="Code"><input name="code" required placeholder="EID25" className="a-input uppercase" /></Field>
        <Field label="Type">
          <select name="kind" className="a-input"><option value="percent">Percent (%)</option><option value="fixed">Fixed amount (BHD)</option></select>
        </Field>
        <Field label="Value" hint="e.g. 25 for 25%, or 2.500 BHD"><input name="value" required inputMode="decimal" className="a-input" /></Field>
        <Field label="Min order (BHD)"><input name="min_order" inputMode="decimal" className="a-input" /></Field>
        <Field label="Max uses (blank = unlimited)"><input name="max_uses" inputMode="numeric" className="a-input" /></Field>
        <Field label="Starts"><input name="starts" type="date" className="a-input" /></Field>
        <Field label="Ends (inclusive)"><input name="ends" type="date" className="a-input" /></Field>
        <button className="a-btn">Create code</button>
      </form>

      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Uses</th><th>Valid</th><th>State</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="text-neutral-500">No discount codes yet.</td></tr>}
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="font-mono font-semibold">{d.code}</td>
                <td>{d.kind === "percent" ? `${d.value}%` : `${bhd(String(d.value))} BHD`}</td>
                <td className="tabular-nums">{Number(d.min_order_minor) ? bhd(d.min_order_minor) : "—"}</td>
                <td className="tabular-nums">{d.used_count}{d.max_uses !== null ? ` / ${d.max_uses}` : ""}</td>
                <td className="text-xs whitespace-nowrap">{day(d.starts_at)} → {day(d.ends_at)}</td>
                <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${state(d) === "Live" ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-700"}`}>{state(d)}</span></td>
                <td>
                  <div className="flex gap-2">
                    <form action={toggleDiscount}><input type="hidden" name="id" value={d.id} /><button className="a-btn-ghost">{d.is_active ? "Disable" : "Enable"}</button></form>
                    <form action={deleteDiscount}><input type="hidden" name="id" value={d.id} /><button className="a-btn-ghost !text-red-700">Delete</button></form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
