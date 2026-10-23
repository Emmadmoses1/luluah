// NOWPayments client (POST /invoice, GET /payment/{id}). Test in the sandbox first:
// NOWPAYMENTS_API_URL=https://api-sandbox.nowpayments.io/v1
const base = () => process.env.NOWPAYMENTS_API_URL || "https://api.nowpayments.io/v1";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) throw new Error("NOWPAYMENTS_API_KEY is not set");
  const r = await fetch(base() + path, {
    ...init,
    headers: { "x-api-key": key, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`NOWPayments ${path} returned HTTP ${r.status}`);
  return (await r.json()) as T;
}

export type Invoice = { id: string | number; invoice_url: string };
export type PaymentInfo = {
  payment_id: number | string; payment_status: string; order_id?: string; price_amount?: number | string;
  price_currency?: string; pay_currency?: string; pay_amount?: number | string; actually_paid?: number | string;
  invoice_id?: number | string | null;
};

export function createInvoice(p: { amountUsd: string; orderRef: string; description: string; siteUrl: string; returnPath?: string }) {
  return call<Invoice>("/invoice", {
    method: "POST",
    body: JSON.stringify({
      price_amount: p.amountUsd, price_currency: "usd", order_id: p.orderRef, order_description: p.description,
      ipn_callback_url: `${p.siteUrl}/api/webhooks/nowpayments`,
      success_url: `${p.siteUrl}${p.returnPath ?? "/order/" + p.orderRef}`, cancel_url: `${p.siteUrl}${p.returnPath ?? "/order/" + p.orderRef}`,
      is_fixed_rate: true,
    }),
  });
}

export const getPayment = (id: string | number) => call<PaymentInfo>(`/payment/${encodeURIComponent(String(id))}`);

export type DirectPayment = { payment_id: number | string; payment_status: string; pay_address: string; pay_amount: number | string; pay_currency: string };

/** A payment with its own deposit address (used for card-to-crypto deposits). */
export function createDirectPayment(p: { amountUsd: string; orderRef: string; payCurrency: string; description: string; siteUrl: string }) {
  return call<DirectPayment>("/payment", {
    method: "POST",
    body: JSON.stringify({
      price_amount: p.amountUsd, price_currency: "usd", pay_currency: p.payCurrency, order_id: p.orderRef,
      order_description: p.description, ipn_callback_url: `${p.siteUrl}/api/webhooks/nowpayments`, is_fixed_rate: true,
    }),
  });
}
