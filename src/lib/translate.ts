// English -> Arabic translation for product and category text entered in the admin.
// Providers (first one configured wins): Google Cloud Translation, or Claude via the Anthropic API.
export type Provider = "google" | "anthropic";

export function translationProvider(): Provider | null {
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return "google";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

/** Pulls a JSON array of n strings out of a model reply. */
export function parseJsonArray(text: string, n: number): string[] | null {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const a = JSON.parse(m[0]);
    if (Array.isArray(a) && a.length === n && a.every((x) => typeof x === "string")) return a;
  } catch { /* fall through */ }
  return null;
}

async function google(items: string[], key: string): Promise<string[] | null> {
  const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: items, source: "en", target: "ar", format: "text" }), signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) { console.error("[translate] google HTTP", r.status); return null; }
  const d = await r.json().catch(() => null);
  const t = d?.data?.translations;
  if (!Array.isArray(t) || t.length !== items.length || !t.every((x: { translatedText?: unknown }) => typeof x?.translatedText === "string")) return null;
  return t.map((x: { translatedText: string }) => x.translatedText);
}

async function anthropic(items: string[], key: string): Promise<string[] | null> {
  const prompt =
    "Translate each English string in the JSON array below into natural Modern Standard Arabic for a luxury Gulf fashion and lifestyle online store. " +
    "Keep brand names, SKUs, numbers and Latin model names unchanged. Do not add or remove information. " +
    "Reply with ONLY a JSON array of the same length, in the same order, containing the Arabic strings.\n\n" + JSON.stringify(items);
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.TRANSLATE_MODEL || "claude-haiku-5-5", max_tokens: 4096, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) { console.error("[translate] anthropic HTTP", r.status); return null; }
  const d = await r.json().catch(() => null);
  const text = Array.isArray(d?.content) ? d.content.find((b: { type?: string }) => b?.type === "text")?.text : null;
  return typeof text === "string" ? parseJsonArray(text, items.length) : null;
}

/** Translates the given strings. Empty strings stay empty. Returns null if not configured or if the service fails. */
export async function translateToArabic(texts: string[]): Promise<string[] | null> {
  const provider = translationProvider();
  if (!provider) return null;
  const idx = texts.map((t, i) => (t.trim() ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) return texts.map(() => "");
  const items = idx.map((i) => texts[i].trim().slice(0, 5000));
  try {
    const out = provider === "google" ? await google(items, process.env.GOOGLE_TRANSLATE_API_KEY!) : await anthropic(items, process.env.ANTHROPIC_API_KEY!);
    if (!out) return null;
    const res = texts.map(() => "");
    idx.forEach((i, k) => { res[i] = out[k].trim(); });
    return res;
  } catch (e) { console.error("[translate] failed:", (e as Error).message); return null; }
}

export type Pair = { en: string; ar: string; force?: boolean };

/**
 * Decides the Arabic text for each pair: a typed Arabic value wins (unless force),
 * otherwise the English text is translated.
 */
export async function resolveArabic(
  pairs: Pair[],
  translate: (t: string[]) => Promise<string[] | null> = translateToArabic,
  available: boolean = translationProvider() !== null,
): Promise<{ ok: true; ar: string[] } | { ok: false; error: "translate" | "translate_failed" }> {
  const ar = pairs.map((p) => p.ar.trim());
  const need = pairs.map((p, i) => (p.en.trim() && (!ar[i] || p.force) ? i : -1)).filter((i) => i >= 0);
  if (need.length === 0) return { ok: true, ar };
  if (!available) return { ok: false, error: "translate" };
  const out = await translate(need.map((i) => pairs[i].en));
  if (!out) return { ok: false, error: "translate_failed" };
  need.forEach((i, k) => { ar[i] = out[k]; });
  return { ok: true, ar };
}
