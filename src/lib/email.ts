// Optional email via the Resend HTTP API. Without RESEND_API_KEY and EMAIL_FROM it logs and does nothing.
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) { console.log(`[email] not configured, skipped: ${subject}`); return false; }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!r.ok) console.error(`[email] provider returned HTTP ${r.status}`);
    return r.ok;
  } catch (e) { console.error("[email] failed", e instanceof Error ? e.message : e); return false; }
}
