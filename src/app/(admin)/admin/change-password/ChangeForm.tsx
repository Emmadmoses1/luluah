"use client";
import { useActionState } from "react";
import { changePassword } from "./actions";

export default function ChangeForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const input = "mt-1 w-full border rounded px-3 py-2";
  return (
    <form action={action} className="w-full max-w-sm bg-white p-6 rounded shadow space-y-4">
      <h1 className="text-xl font-semibold">Change password</h1>
      {forced && <p className="text-sm bg-amber-100 p-2 rounded">You must replace the temporary password before using the admin.</p>}
      <label className="block text-sm">Current password
        <input name="current" type="password" required autoComplete="current-password" className={input} /></label>
      <label className="block text-sm">New password (14+ characters)
        <input name="next" type="password" required minLength={14} autoComplete="new-password" className={input} /></label>
      <label className="block text-sm">Repeat new password
        <input name="again" type="password" required minLength={14} autoComplete="new-password" className={input} /></label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="w-full bg-neutral-900 text-white py-2 rounded disabled:opacity-50">
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
