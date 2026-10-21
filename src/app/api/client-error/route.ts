// Receives crash reports from the browser so they show up in the server logs. Rate limited and size capped.
const hits = new Map<string, { n: number; t: number }>();

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  const now = Date.now();
  const h = hits.get(ip);
  if (h && now - h.t < 60_000) { if (h.n >= 5) return new Response(null, { status: 204 }); h.n++; }
  else hits.set(ip, { n: 1, t: now });
  if (hits.size > 500) hits.clear();
  try {
    const j = JSON.parse((await req.text()).slice(0, 4000));
    console.error("[client-error]", JSON.stringify({
      path: String(j.path ?? "").slice(0, 200), message: String(j.message ?? "").slice(0, 300),
      digest: String(j.digest ?? "").slice(0, 50), stack: String(j.stack ?? "").slice(0, 1500),
    }));
  } catch { /* ignore malformed reports */ }
  return new Response(null, { status: 204 });
}
