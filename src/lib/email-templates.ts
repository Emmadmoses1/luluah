const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const shell = (title: string, body: string) => `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#faf6ee;font-family:Tahoma,Arial,sans-serif;color:#0c0a09">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#0c0a09;color:#c9a96e;text-align:center;padding:18px;font-size:26px;font-weight:bold">لؤلؤة</div>
<div style="background:#fff;padding:24px;line-height:1.9"><h2 style="margin-top:0">${esc(title)}</h2>${body}</div>
<p style="text-align:center;font-size:12px;opacity:.6">لؤلؤة — الفخامة التي تليق بك</p></div></body></html>`;

export const showRef = (ref: string) => `LU-${ref.slice(0, 4)}-${ref.slice(4, 8)}-${ref.slice(8)}`;

export function orderReceivedEmail(o: { name: string; ref: string; total: string; siteUrl: string }) {
  return {
    subject: `تم استلام طلبك ${showRef(o.ref)}`,
    html: shell("شكراً لطلبك", `<p>مرحباً ${esc(o.name)}،</p><p>تم تسجيل طلبك برقم <b dir="ltr">${showRef(o.ref)}</b> بإجمالي <b>${esc(o.total)}</b>.</p>
<p>لن يُعتبر الطلب مدفوعاً إلا بعد تأكيد الدفع فعلياً.</p><p><a href="${esc(o.siteUrl)}/order/${esc(o.ref)}">متابعة حالة الطلب</a></p>`),
  };
}

export function paymentConfirmedEmail(o: { name: string; ref: string; siteUrl: string }) {
  return {
    subject: `تم تأكيد الدفع للطلب ${showRef(o.ref)}`,
    html: shell("تم تأكيد الدفع", `<p>مرحباً ${esc(o.name)}،</p><p>تم تأكيد دفع طلبك <b dir="ltr">${showRef(o.ref)}</b>. سنبدأ بتجهيزه قريباً.</p>
<p><a href="${esc(o.siteUrl)}/order/${esc(o.ref)}">متابعة حالة الطلب</a></p>`),
  };
}

export function adminNewOrderEmail(o: { ref: string; total: string; country: string }) {
  return { subject: `New order ${showRef(o.ref)}`, html: `<p>New order <b>${showRef(o.ref)}</b> from ${esc(o.country)}. Total: ${esc(o.total)}.</p>` };
}

export function orderShippedEmail(o: { name: string; ref: string; tracking: string | null; siteUrl: string }) {
  const track = o.tracking ? `<p>رقم التتبع: <b dir="ltr">${esc(o.tracking)}</b></p>` : "";
  return {
    subject: `تم شحن طلبك ${showRef(o.ref)}`,
    html: shell("تم شحن طلبك", `<p>مرحباً ${esc(o.name)}،</p><p>تم شحن طلبك <b dir="ltr">${showRef(o.ref)}</b>.</p>${track}
<p><a href="${esc(o.siteUrl)}/order/${esc(o.ref)}">متابعة حالة الطلب</a></p>`),
  };
}
