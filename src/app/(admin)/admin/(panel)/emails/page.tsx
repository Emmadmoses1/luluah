import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { emailConfigured } from "@/lib/mailer";
import { runMaintenanceNow, sendTestEmail } from "@/app/(admin)/admin/email-actions";

function Row({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full grid place-items-center text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{ok ? "✓" : "✕"}</span>
      <div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-neutral-500">{hint}</p></div>
    </li>
  );
}

export default async function Emails({ searchParams }: { searchParams: Promise<{ ran?: string; e?: string; r?: string; i?: string; test?: string }> }) {
  await requireAdmin(["owner", "manager"]);
  const q = await searchParams;
  const { store } = await getSettings();
  const [job] = await sql<{ last_run_at: Date; summary: string | null }[]>`select last_run_at, summary from job_runs where name = 'maintenance'`;
  const [c] = await sql<{ remind: string; invoice: string }[]>`
    select
      (select count(*) from orders where payment_status in ('unpaid','pending') and fulfillment_status = 'new' and not stock_released and not is_test and customer_email is not null and reminder_sent_at is null) as remind,
      (select count(*) from orders where payment_status = 'paid' and customer_email is not null and invoice_sent_at is null and not is_test) as invoice`;
  const log = await sql<{ kind: string; to_masked: string; ok: boolean; created_at: Date; ref: string | null }[]>`
    select l.kind, l.to_masked, l.ok, l.created_at, o.ref from email_log l left join orders o on o.id = l.order_id
    order by l.created_at desc limit 40`;
  const ageH = job ? (Date.now() - job.last_run_at.getTime()) / 3_600_000 : null;
  const fresh = ageH !== null && ageH < 3;
  const testMsg: Record<string, string> = { ok: "Test email sent. Check the inbox.", fail: "The email service refused the message. Check RESEND_API_KEY and that your sending domain is verified.",
    notconfigured: "Email is not configured: set RESEND_API_KEY and EMAIL_FROM in Render.", email: "Enter a valid email address." };

  return (
    <>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[.25em] text-[#a8864a]">Marketing &amp; operations</p>
        <h1 className="text-3xl font-semibold mt-1">Emails</h1>
        <p className="text-sm text-neutral-600 mt-2 max-w-3xl">Customers get an invoice when payment is confirmed, one reminder if an order is still unpaid after a couple of hours, and a notice if it is cancelled for non-payment. Orders marked TEST never get reminders.</p>
      </div>
      {q.ran && <p role="status" className="mb-4 rounded-xl bg-emerald-100 text-emerald-900 px-4 py-3 text-sm">Job finished: {q.e} order(s) expired, {q.r} reminder(s) sent, {q.i} invoice(s) sent.</p>}
      {q.test && <p role="status" className={`mb-4 rounded-xl px-4 py-3 text-sm ${q.test === "ok" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{testMsg[q.test] ?? "Done."}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="a-card p-5">
          <h2 className="font-semibold">Status</h2>
          <ul className="divide-y divide-neutral-100 mt-2">
            <Row ok={emailConfigured()} label="Email provider is set up" hint="RESEND_API_KEY and EMAIL_FROM in Render. The sender domain must be verified in Resend." />
            <Row ok={Boolean(process.env.CRON_SECRET)} label="Scheduler password is set (CRON_SECRET)" hint="Needed so that only your scheduler can start the job." />
            <Row ok={/^https:\/\//.test(process.env.SITE_URL ?? "")} label="SITE_URL is an https address" hint="Used for the links inside emails." />
            <Row ok={Boolean(store.legal_name_ar)} label="Registered business name is filled in" hint="Admin → Store Settings. Printed on invoices." />
            <Row ok={Boolean(store.tax_number)} label="Tax / VAT number is filled in" hint="Only add a real number issued to your business." />
            <Row ok={fresh} label="The scheduled job is running" hint={job ? `Last run ${job.last_run_at.toISOString().slice(0, 16).replace("T", " ")} UTC: ${job.summary ?? ""}` : "It has never run. Set up the scheduler (see the instructions I sent)."} />
          </ul>
        </section>
        <section className="a-card p-5 space-y-4">
          <h2 className="font-semibold">Actions</h2>
          <p className="text-sm text-neutral-600">Waiting now: <b>{c.remind}</b> unpaid order(s) for a reminder, <b>{c.invoice}</b> paid order(s) without an invoice email.</p>
          <form action={runMaintenanceNow}><button className="a-btn">Run the job now</button></form>
          <form action={sendTestEmail} className="flex flex-wrap gap-2 items-end">
            <label className="a-label flex-1 min-w-[12rem]">Send a test email to
              <input name="to" type="email" required defaultValue={process.env.ADMIN_NOTIFY_EMAIL ?? ""} dir="ltr" className="a-input mt-1.5 normal-case tracking-normal font-normal text-neutral-900" />
            </label>
            <button className="a-btn-ghost">Send test</button>
          </form>
        </section>
      </div>

      <section className="a-card mt-6 overflow-hidden">
        <h2 className="px-5 py-4 font-semibold">Recent emails (invoices, reminders, notices, tests)</h2>
        <div className="overflow-x-auto">
          <table className="a-table">
            <thead><tr><th>Time (UTC)</th><th>Type</th><th>To</th><th>Order</th><th>Result</th></tr></thead>
            <tbody>
              {log.length === 0 && <tr><td colSpan={5} className="text-neutral-500">Nothing sent yet.</td></tr>}
              {log.map((l, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap">{l.created_at.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="capitalize">{l.kind}</td><td dir="ltr">{l.to_masked}</td>
                  <td className="font-mono text-xs">{l.ref ? `LU-${l.ref.slice(0, 4)}-${l.ref.slice(4, 8)}-${l.ref.slice(8)}` : "—"}</td>
                  <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${l.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{l.ok ? "sent" : "failed"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
