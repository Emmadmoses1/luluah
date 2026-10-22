import { sql } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { bhdFmt, expiredEmail, reminderEmail } from "@/lib/email-templates";
import { emailConfigured, logEmail, sendInvoiceByRef, siteUrl } from "@/lib/mailer";

type Expired = { id: string; ref: string; name: string; email: string | null; test: boolean };

/** Cancels unpaid orders older than `hours` and returns their stock. Orders whose payment is in progress are left alone. */
export async function expireStale(hours: number): Promise<Expired[]> {
  const stale = await sql<{ id: string }[]>`
    select id from orders
    where payment_status in ('unpaid','pending') and fulfillment_status = 'new' and stock_released = false
      and created_at < now() - make_interval(hours => ${hours})`;
  const done: Expired[] = [];
  for (const o of stale) {
    const row = await sql.begin(async (tx) => {
      const [cur] = await tx<{ payment_status: string; fulfillment_status: string; stock_released: boolean; ref: string;
        customer_name: string; customer_email: string | null; is_test: boolean }[]>`
        select payment_status, fulfillment_status, stock_released, ref, customer_name, customer_email, is_test
        from orders where id = ${o.id} for update`;
      if (!cur || cur.stock_released || cur.fulfillment_status !== "new" || !["unpaid", "pending"].includes(cur.payment_status)) return null;
      await tx`update product_variants v set stock = v.stock + i.qty from order_items i where i.order_id = ${o.id} and i.variant_id = v.id`;
      await tx`update orders set payment_status = 'expired', fulfillment_status = 'cancelled', stock_released = true, updated_at = now() where id = ${o.id}`;
      return cur;
    });
    if (row) done.push({ id: o.id, ref: row.ref, name: row.customer_name, email: row.customer_email, test: row.is_test });
  }
  return done;
}

export async function sendExpiredNotices(expired: Expired[]): Promise<number> {
  if (!emailConfigured()) return 0;
  let n = 0;
  for (const e of expired) {
    if (!e.email || e.test) continue;
    const m = expiredEmail({ name: e.name, ref: e.ref, siteUrl: siteUrl() });
    const ok = await sendEmail(e.email, m.subject, m.html);
    await logEmail(e.id, "expired", e.email, ok);
    if (ok) n++;
  }
  return n;
}

/** One reminder per unpaid order, once it is `hoursAfter` hours old. Each order is claimed first so it can never be reminded twice. */
export async function sendReminders(hoursAfter: number, expiryHours: number, limit = 50): Promise<number> {
  if (!emailConfigured()) return 0;
  const rows = await sql<{ id: string; ref: string; customer_name: string; customer_email: string; total_minor: string; created_at: Date }[]>`
    update orders set reminder_sent_at = now() where id in (
      select id from orders
      where payment_status in ('unpaid','pending') and fulfillment_status = 'new' and stock_released = false and not is_test
        and customer_email is not null and reminder_sent_at is null
        and created_at < now() - make_interval(hours => ${hoursAfter}) and created_at > now() - interval '7 days'
      order by created_at limit ${limit} for update skip locked)
    returning id, ref, customer_name, customer_email, total_minor, created_at`;
  let n = 0;
  for (const o of rows) {
    const hoursLeft = Math.max(1, Math.ceil(expiryHours - (Date.now() - o.created_at.getTime()) / 3_600_000));
    const m = reminderEmail({ name: o.customer_name, ref: o.ref, total: bhdFmt(o.total_minor), siteUrl: siteUrl(), hoursLeft });
    const ok = await sendEmail(o.customer_email, m.subject, m.html);
    await logEmail(o.id, "reminder", o.customer_email, ok);
    if (ok) n++;
    else await sql`update orders set reminder_sent_at = null where id = ${o.id}`; // try again on the next run
  }
  return n;
}

export async function sendPendingInvoices(limit = 50): Promise<number> {
  if (!emailConfigured()) return 0;
  const rows = await sql<{ ref: string }[]>`
    select ref from orders
    where payment_status = 'paid' and customer_email is not null and invoice_sent_at is null and not is_test
      and created_at > now() - interval '30 days' order by created_at limit ${limit}`;
  let n = 0;
  for (const o of rows) if (await sendInvoiceByRef(o.ref)) n++;
  return n;
}

export async function runMaintenance() {
  const { payments } = await getSettings();
  const expiryHours = Number(payments.order_expiry_hours) > 0 ? Number(payments.order_expiry_hours) : 24;
  const wanted = Number(process.env.REMINDER_AFTER_HOURS) > 0 ? Number(process.env.REMINDER_AFTER_HOURS) : 2;
  const remindAfter = Math.min(wanted, Math.max(1, Math.floor(expiryHours / 2)));

  const expired = await expireStale(expiryHours);
  const notices = await sendExpiredNotices(expired);
  const reminded = await sendReminders(remindAfter, expiryHours);
  const invoices = await sendPendingInvoices();
  const summary = `expired ${expired.length} (${notices} notices), reminders ${reminded}, invoices ${invoices}`;
  await sql`insert into job_runs (name, last_run_at, summary) values ('maintenance', now(), ${summary})
            on conflict (name) do update set last_run_at = now(), summary = excluded.summary`;
  return { expired: expired.length, notices, reminded, invoices };
}
