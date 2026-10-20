"use client";
import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    try {
      const body = JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest, path: location.pathname });
      navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }));
    } catch { /* ignore */ }
  }, [error]);
  return (
    <main className="max-w-xl mx-auto p-10 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-neutral-600 text-sm">This page could not be shown. Try again; if it keeps happening, check the server logs{error.digest ? ` (reference ${error.digest})` : ""}.</p>
      <button onClick={reset} className="a-btn mt-6">Try again</button>
    </main>
  );
}
