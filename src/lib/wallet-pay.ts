import { sql } from "@/lib/db";
import { postEntry } from "@/lib/wallet";
import { sendInvoiceByRef } from "@/lib/mailer";

type Result = { ok: true } | { ok: false; error: string };

/** Pays a whole unpaid order from the wallet, atomically: balance check, ledger entry and order status in ONE transaction. */
export async function payOrderWithWallet(accountId: string, ref: string): Promise<Result> {
  const result = await sql.begin(async (tx): Promise<Result> => {
    const [o] = await tx<{ id: string; total_minor: string; payment_status: string; fulfillment_status: string; currency_code: string }[]>`
      select id, total_minor, payment_status, fulfillment_status, currency_code from orders where ref = ${ref} for update`;
    if (!o) return { ok: false, error: "الطلب غير موجود." };
    if (o.fulfillment_status === "cancelled" || !["unpaid", "pending"].includes(o.payment_status)) return { ok: false, error: "لا يمكن الدفع لهذا الطلب حالياً." };
    const total = Number(o.total_minor);
    if (o.currency_code !== "BHD" || !(total > 0)) return { ok: false, error: "تعذّر الدفع من المحفظة لهذا الطلب." };
    const r = await postEntry(tx, { accountId, kind: "purchase", amountMinor: -total, orderId: o.id, note: `Order ${ref}` });
    if (!r.ok) return { ok: false, error: r.reason === "insufficient" ? "رصيد المحفظة غير كافٍ لهذا الطلب." : "تم دفع هذا الطلب مسبقاً." };
    await tx`update orders set payment_status = 'paid', paid_at = now(), payment_method = 'wallet', updated_at = now() where id = ${o.id}`;
    return { ok: true };
  });
  if (result.ok) { try { await sendInvoiceByRef(ref); } catch { /* the invoice can be re-sent later */ } }
  return result;
}

type Refund = { ok: true; amountMinor: number } | { ok: false; error: string };

/** Admin: returns the money of a WALLET-paid order to the same wallet. Works once per order. */
export async function refundOrderToWallet(ref: string, adminId: string): Promise<Refund> {
  return sql.begin(async (tx): Promise<Refund> => {
    const [o] = await tx<{ id: string; payment_status: string; payment_method: string | null; fulfillment_status: string; stock_released: boolean }[]>`
      select id, payment_status, payment_method, fulfillment_status, stock_released from orders where ref = ${ref} for update`;
    if (!o) return { ok: false, error: "Order not found." };
    if (o.payment_method !== "wallet" || o.payment_status !== "paid") return { ok: false, error: "Only paid orders that were paid from the wallet can be refunded here." };
    const [t] = await tx<{ account_id: string; amount_minor: string }[]>`
      select account_id, amount_minor from wallet_transactions where order_id = ${o.id} and kind = 'purchase'`;
    if (!t) return { ok: false, error: "No wallet payment was found for this order." };
    const amount = -Number(t.amount_minor);
    const r = await postEntry(tx, { accountId: t.account_id, kind: "refund", amountMinor: amount, orderId: o.id, note: `Refund ${ref}`, adminId });
    if (!r.ok) return { ok: false, error: "This order has already been refunded." };
    const releasable = ["new", "processing"].includes(o.fulfillment_status) && !o.stock_released;
    if (releasable) {
      await tx`update product_variants v set stock = v.stock + i.qty from order_items i where i.order_id = ${o.id} and i.variant_id = v.id`;
    }
    await tx`update orders set payment_status = 'refunded',
      fulfillment_status = case when ${releasable}::boolean then 'cancelled' else fulfillment_status end,
      stock_released = stock_released or ${releasable}::boolean, updated_at = now() where id = ${o.id}`;
    return { ok: true, amountMinor: amount };
  });
}
