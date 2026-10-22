"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { audit, requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { emailConfigured, logEmail, sendInvoiceByRef } from "@/lib/mailer";
import { runMaintenance } from "@/lib/maintenance";

const MANAGERS: ("owner" | "manager")[] = ["owner", "manager"];

export async function runMaintenanceNow() {
  const admin = await requireAdmin(MANAGERS);
  const r = await runMaintenance();
  await audit(admin.id, "maintenance.run", r);
  redirect(`/admin/emails?ran=1&e=${r.expired}&r=${r.reminded}&i=${r.invoices}`);
}

export async function sendTestEmail(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const to = z.string().trim().email().max(120).safeParse(fd.get("to"));
  if (!to.success) return redirect("/admin/emails?test=email");
  if (!emailConfigured()) return redirect("/admin/emails?test=notconfigured");
  const ok = await sendEmail(to.data, "Test email from Luluah admin", "<p>This is a test email from your store. If you can read it, email sending works.</p>");
  await logEmail(null, "test", to.data, ok);
  await audit(admin.id, "email.test", { ok });
  return redirect(`/admin/emails?test=${ok ? "ok" : "fail"}`);
}

export async function resendInvoice(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = z.string().uuid().parse(fd.get("id"));
  const [o] = await sql<{ ref: string }[]>`select ref from orders where id = ${id}`;
  const ok = o ? await sendInvoiceByRef(o.ref, true) : false;
  await audit(admin.id, "invoice.resend", { id, ok });
  redirect(`/admin/orders/${id}?${ok ? "saved=1" : "error=email"}`);
}
