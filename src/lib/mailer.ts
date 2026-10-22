import { sql } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getSettings } from "@/lib/settings";
import { bhdFmt, invoiceEmail, type InvoiceData } from "@/lib/email-templates";
import { invoiceToken } from "@/lib/invoice-token";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const siteUrl = () => (process.env.SITE_URL ?? "").replace(/\/+$/, "");

/** Only a masked address is stored in the log, to keep personal data to a minimum. */
export function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  return `${(u ?? "").slice(0, 2)}***@${d ?? ""}`;
}

export async function logEmail(orderId: string | null, kind: string, to: string, ok: boolean) {
  try {
    await sql`insert into email_log (order_id, kind, to_masked, ok) values (${orderId}, ${kind}, ${maskEmail(to)}, ${ok})`;
  } catch { /* logging must never stop an email */ }
}

export type LoadedInvoice = InvoiceData & { paid: boolean; email: string | null; orderId: string };

/** Loads an order as invoice data. A paid order receives its permanent invoice number the first time. */
export async function loadInvoice(ref: string): Promise<LoadedInvoice | null> {
  const [o] = await sql<{ id: string; ref: string; customer_name: string; customer_email: string | null; payment_status: string;
    is_test: boolean; subtotal_minor: string; discount_minor: string; shipping_minor: string; total_minor: string;
    invoice_no: string | null; paid_at: Date | null; created_at: Date; country_ar: string }[]>`
    select o.id, o.ref, o.customer_name, o.customer_email, o.payment_status, o.is_test, o.subtotal_minor, o.discount_minor,
           o.shipping_minor, o.total_minor, o.invoice_no, o.paid_at, o.created_at, c.name_ar as country_ar
    from orders o join countries c on c.iso2 = o.country_iso2 where o.ref = ${ref}`;
  if (!o) return null;
  const paid = o.payment_status === "paid";
  let no = o.invoice_no === null ? 0 : Number(o.invoice_no);
  if (paid && no === 0) {
    const [n] = await sql<{ invoice_no: string }[]>`
      update orders set invoice_no = coalesce(invoice_no, nextval('invoice_seq')) where id = ${o.id} returning invoice_no`;
    no = Number(n.invoice_no);
  }
  const items = await sql<{ product_name: string; variant_label: string | null; qty: number; unit_minor: string; line_minor: string }[]>`
    select product_name, variant_label, qty, unit_minor, line_minor from order_items where order_id = ${o.id}`;
  const { store } = await getSettings();
  return {
    orderId: o.id, paid, email: o.customer_email, invoiceNo: no, ref: o.ref, name: o.customer_name,
    date: (o.paid_at ?? o.created_at).toISOString().slice(0, 10), countryAr: o.country_ar, test: o.is_test, confirmed: paid,
    items: items.map((i) => ({ name: i.product_name, variant: i.variant_label, qty: i.qty, unit: bhdFmt(i.unit_minor), line: bhdFmt(i.line_minor) })),
    subtotal: bhdFmt(o.subtotal_minor), discount: Number(o.discount_minor) > 0 ? bhdFmt(o.discount_minor) : null,
    shipping: bhdFmt(o.shipping_minor), total: bhdFmt(o.total_minor),
    seller: { name: store.legal_name_ar, address: store.address_ar, phone: store.contact_phone, email: store.contact_email, tax: store.tax_number },
    link: `${siteUrl()}/invoice/${o.ref}?t=${invoiceToken(o.ref)}`,
  };
}

/** Emails the invoice of a PAID order. Returns true if it was sent now or had already been sent. */
export async function sendInvoiceByRef(ref: string, force = false): Promise<boolean> {
  const [o] = await sql<{ id: string; customer_email: string | null; payment_status: string; invoice_sent_at: Date | null }[]>`
    select id, customer_email, payment_status, invoice_sent_at from orders where ref = ${ref}`;
  if (!o || !o.customer_email || o.payment_status !== "paid") return false;
  if (o.invoice_sent_at && !force) return true;
  const d = await loadInvoice(ref);
  if (!d) return false;
  const m = invoiceEmail(d);
  const ok = await sendEmail(o.customer_email, m.subject, m.html);
  await logEmail(o.id, "invoice", o.customer_email, ok);
  if (ok) await sql`update orders set invoice_sent_at = now() where id = ${o.id}`;
  return ok;
}
