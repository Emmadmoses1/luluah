/** Minimal RFC-4180 CSV parser (quotes, "" escapes, CRLF, BOM). Returns string[][]. */
export function parseCsv(text) {
  const rows = []; let row = [], f = "", q = false;
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(f); f = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else f += ch;
  }
  row.push(f);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

const toWestern = (s) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

/**
 * Header (required): country,code,place_name   optional: admin_name
 * allowed: Set of ISO2. regexes: Map<ISO2, string> (countries.postal_regex) used to reject malformed codes.
 */
export function parsePostalCsv(text, allowed, regexes = new Map()) {
  const all = parseCsv(text);
  if (all.length === 0) return { rows: [], rejected: [], error: "The file is empty." };
  const head = all[0].map((h) => h.trim().toLowerCase());
  const idx = (n) => head.indexOf(n);
  const [ic, ik, ip, ia] = [idx("country"), idx("code"), idx("place_name"), idx("admin_name")];
  if (ic < 0 || ik < 0 || ip < 0) return { rows: [], rejected: [], error: "Header must contain: country,code,place_name (optional: admin_name)." };
  const rows = [], rejected = [], seen = new Set();
  all.slice(1).forEach((c, n) => {
    const line = n + 2;
    const iso = (c[ic] ?? "").trim().toUpperCase();
    let code = toWestern((c[ik] ?? "").replace(/[\u200E\u200F\u202A-\u202E\u00A0]/g, "").trim()).toUpperCase();
    const place = (c[ip] ?? "").trim().slice(0, 120);
    if (!allowed.has(iso)) return rejected.push({ line, reason: `unknown country "${iso}"` });
    if (!code || code.length > 20) return rejected.push({ line, reason: "bad code" });
    if (!place) return rejected.push({ line, reason: "missing place_name" });
    const re = regexes.get(iso);
    if (re) {
      const rx = new RegExp(re);
      if (!rx.test(code)) {
        const head = code.split("-")[0]; // e.g. Saudi "23955-6900" = postal code + additional number
        if (head !== code && rx.test(head)) code = head;
        else return rejected.push({ line, reason: `code ${code} does not match the ${iso} format` });
      }
    }
    const key = `${iso}|${code}|${place}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ country_iso2: iso, code, place_name: place, admin_name: ia >= 0 ? ((c[ia] ?? "").trim().slice(0, 120) || null) : null });
  });
  return { rows, rejected, error: null };
}
