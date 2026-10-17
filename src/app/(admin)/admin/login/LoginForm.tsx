"use client";
import { useActionState } from "react";
import { login } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  const input = "mt-1.5 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-[#c9a96e] focus:ring-4 focus:ring-[#c9a96e]/20 transition";
  return (
    <form action={action} className="relative w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-2xl space-y-5">
      <div className="text-center">
        <span className="mx-auto w-14 h-14 rounded-full grid place-items-center text-xl font-bold text-[#0c0a09] pearl-orb">L</span>
        <h1 className="mt-4 text-2xl font-semibold">Luluah Admin</h1>
        <p className="text-sm text-neutral-500">Sign in to manage your store</p>
      </div>
      <label className="block text-sm font-medium">Email
        <input name="email" type="email" required autoComplete="username" className={input} />
      </label>
      <label className="block text-sm font-medium">Password
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-[#0c0a09] text-[#c9a96e] py-3 font-semibold hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-colors disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
