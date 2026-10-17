"use client";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="w-full max-w-sm bg-white p-6 rounded shadow space-y-4">
      <h1 className="text-xl font-semibold">Luluah Admin</h1>
      <label className="block text-sm">Email
        <input name="email" type="email" required autoComplete="username" className="mt-1 w-full border rounded px-3 py-2" />
      </label>
      <label className="block text-sm">Password
        <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full border rounded px-3 py-2" />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="w-full bg-neutral-900 text-white py-2 rounded disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
