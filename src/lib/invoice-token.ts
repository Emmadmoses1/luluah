import { createHmac, timingSafeEqual } from "node:crypto";

/** Secret used to sign invoice links. Set INVOICE_SECRET to choose your own; otherwise one is derived privately from DATABASE_URL. */
export function invoiceKey(): string {
  return process.env.INVOICE_SECRET || createHmac("sha256", process.env.DATABASE_URL ?? "luluah-dev").update("luluah-invoice-key").digest("hex");
}

export function invoiceToken(ref: string, key: string = invoiceKey()): string {
  return createHmac("sha256", key).update("invoice:" + ref).digest("hex").slice(0, 32);
}

export function verifyInvoiceToken(ref: string, token: string, key: string = invoiceKey()): boolean {
  const a = Buffer.from(invoiceToken(ref, key)), b = Buffer.from(token ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}
