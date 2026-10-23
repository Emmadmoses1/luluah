"use client";
import { useActionState } from "react";

type State = { error?: string; ok?: string } | undefined;
export type FieldDef = {
  name: string; label: React.ReactNode; type?: "text" | "email" | "password" | "tel" | "checkbox";
  autoComplete?: string; required?: boolean; dir?: "ltr" | "rtl"; defaultValue?: string; hint?: string;
};

const input = "mt-1.5 w-full rounded-xl border border-beige bg-white px-4 py-3 outline-none focus:border-gold focus:ring-4 focus:ring-gold/20 transition";

export default function ActionForm({ action, fields, submit, hidden, footer }: {
  action: (prev: State, fd: FormData) => Promise<State>; fields: FieldDef[]; submit: string; hidden?: Record<string, string>; footer?: React.ReactNode;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className="space-y-4">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) =>
        f.type === "checkbox" ? (
          <label key={f.name} className="flex items-start gap-2 text-sm">
            <input type="checkbox" name={f.name} required={f.required} className="mt-1 w-4 h-4 accent-[#a8864a]" /><span>{f.label}</span>
          </label>
        ) : (
          <label key={f.name} className="block text-sm font-semibold">{f.label}{f.required ? " *" : ""}
            <input name={f.name} type={f.type ?? "text"} required={f.required} dir={f.dir} autoComplete={f.autoComplete} defaultValue={f.defaultValue} className={input} />
            {f.hint && <span className="block mt-1 text-xs font-normal opacity-60">{f.hint}</span>}
          </label>
        ),
      )}
      {state?.error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-xl bg-emerald-50 text-emerald-900 px-4 py-3 text-sm">{state.ok}</p>}
      <button disabled={pending} className="btn-dark w-full disabled:opacity-60">{pending ? "جارٍ المعالجة…" : submit}</button>
      {footer}
    </form>
  );
}
