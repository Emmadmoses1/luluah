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

// ---- Invoices, reminders and expiry notices ---------------------------------
export const bhdFmt = (minor: number | string) => `${(Number(minor) / 1000).toFixed(3)} د.ب`;

export type InvoiceData = {
  invoiceNo: number; ref: string; name: string; date: string; countryAr: string; test: boolean; confirmed: boolean;
  items: { name: string; variant: string | null; qty: number; unit: string; line: string }[];
  subtotal: string; discount: string | null; shipping: string; total: string;
  seller: { name: string; address: string; phone: string; email: string; tax: string };
  link: string;
};

export function invoiceEmail(d: InvoiceData) {
  const cell = "padding:8px 4px;border-bottom:1px solid #eee";
  const items = d.items.map((i) => `<tr><td style="${cell}">${esc(i.name)}${i.variant ? `<br><span style="font-size:12px;opacity:.65">${esc(i.variant)}</span>` : ""}</td>
<td style="${cell};text-align:center">${i.qty}</td><td style="${cell};text-align:left" dir="ltr">${esc(i.line)}</td></tr>`).join("");
  const tot = (a: string, b: string, bold = false) => `<tr><td style="padding:4px 0;${bold ? "font-weight:bold;font-size:17px;" : ""}">${a}</td><td style="padding:4px 0;text-align:left;${bold ? "font-weight:bold;font-size:17px;" : ""}" dir="ltr">${esc(b)}</td></tr>`;
  const s = d.seller;
  const seller = [s.name && `<b>${esc(s.name)}</b>`, s.address && esc(s.address), s.phone && `<span dir="ltr">${esc(s.phone)}</span>`, s.email && `<span dir="ltr">${esc(s.email)}</span>`, s.tax && `الرقم الضريبي: <span dir="ltr">${esc(s.tax)}</span>`]
    .filter(Boolean).join("<br>");
  return {
    subject: d.confirmed ? `تم تأكيد الدفع وهذه فاتورة طلبك ${showRef(d.ref)}` : `فاتورة طلبك ${showRef(d.ref)}`,
    html: shell(d.confirmed ? "تم تأكيد الدفع" : "فاتورة", `${d.test ? `<p style="background:#fef3c7;padding:8px;text-align:center">نسخة تجريبية</p>` : ""}
<p>مرحباً ${esc(d.name)}،</p><p>${d.confirmed ? "شكراً لك، تم تأكيد دفع طلبك. هذه فاتورتك:" : "هذه فاتورة طلبك:"}</p>
<p style="font-size:13px">رقم الفاتورة: <b dir="ltr">${d.invoiceNo}</b><br>رقم الطلب: <b dir="ltr">${showRef(d.ref)}</b><br>التاريخ: ${esc(d.date)}<br>التوصيل إلى: ${esc(d.countryAr)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px"><tr style="background:#faf6ee"><th style="text-align:right;padding:8px 4px">المنتج</th><th style="padding:8px 4px">الكمية</th><th style="text-align:left;padding:8px 4px">المبلغ</th></tr>${items}</table>
<table style="width:100%;margin-top:12px;font-size:14px">${tot("المجموع الفرعي", d.subtotal)}${d.discount ? tot("الخصم", "-" + d.discount) : ""}${tot("الشحن", d.shipping)}${tot("الإجمالي", d.total, true)}</table>
<p style="font-size:12px;opacity:.7">جميع المبالغ بالدينار البحريني.</p>
${seller ? `<hr style="border:0;border-top:1px solid #eee"><p style="font-size:12px;line-height:1.8">${seller}</p>` : ""}
<p><a href="${esc(d.link)}">عرض الفاتورة وطباعتها</a></p>`),
  };
}

export function reminderEmail(o: { name: string; ref: string; total: string; siteUrl: string; hoursLeft: number }) {
  return {
    subject: `طلبك ${showRef(o.ref)} لم يكتمل بعد`,
    html: shell("طلبك بانتظار إكمال الدفع", `<p>مرحباً ${esc(o.name)}،</p>
<p>سجّلنا طلبك <b dir="ltr">${showRef(o.ref)}</b> بإجمالي <b>${esc(o.total)}</b>، لكن الدفع لم يكتمل بعد.</p>
<p>يمكنك إكمال الدفع من صفحة الطلب. إذا لم يكتمل الدفع، سيُلغى الطلب تلقائياً خلال نحو ${o.hoursLeft.toLocaleString("ar")} ساعة وتُعاد القطع إلى المخزون.</p>
<p><a href="${esc(o.siteUrl)}/order/${esc(o.ref)}" style="display:inline-block;background:#0c0a09;color:#c9a96e;padding:10px 22px;text-decoration:none">إكمال الدفع</a></p>
<p style="font-size:12px;opacity:.7">إذا كنت قد دفعت بالفعل أو لم تعد ترغب بالطلب، يمكنك تجاهل هذه الرسالة.</p>`),
  };
}

export function expiredEmail(o: { name: string; ref: string; siteUrl: string }) {
  return {
    subject: `تم إلغاء طلبك ${showRef(o.ref)}`,
    html: shell("تم إلغاء الطلب", `<p>مرحباً ${esc(o.name)}،</p>
<p>تم إلغاء طلبك <b dir="ltr">${showRef(o.ref)}</b> لأن الدفع لم يكتمل خلال المدة المحددة. لم يُخصم منك شيء عبر متجرنا.</p>
<p>إذا كنت قد أرسلت دفعة، يرجى التواصل معنا مع ذكر رقم الطلب. وللطلب من جديد: <a href="${esc(o.siteUrl)}/shop">تصفّح المتجر</a></p>`),
  };
}

// ---- Customer accounts and wallet ------------------------------------------------
export function verifyAccountEmail(o: { name: string; link: string }) {
  return {
    subject: "أكّد بريدك الإلكتروني في لؤلؤة",
    html: shell("تأكيد البريد الإلكتروني", `<p>مرحباً ${esc(o.name)}،</p><p>شكراً لتسجيلك. اضغط الزر لتأكيد بريدك الإلكتروني:</p>
<p><a href="${esc(o.link)}" style="display:inline-block;background:#0c0a09;color:#c9a96e;padding:10px 22px;text-decoration:none">تأكيد البريد</a></p>
<p style="font-size:12px;opacity:.7">ينتهي الرابط خلال ٢٤ ساعة. إذا لم تنشئ حساباً فتجاهل هذه الرسالة.</p>`),
  };
}

export function resetPasswordEmail(o: { name: string; link: string }) {
  return {
    subject: "إعادة تعيين كلمة المرور",
    html: shell("إعادة تعيين كلمة المرور", `<p>مرحباً ${esc(o.name)}،</p><p>طلبتَ إعادة تعيين كلمة المرور. اضغط الزر لاختيار كلمة مرور جديدة:</p>
<p><a href="${esc(o.link)}" style="display:inline-block;background:#0c0a09;color:#c9a96e;padding:10px 22px;text-decoration:none">كلمة مرور جديدة</a></p>
<p style="font-size:12px;opacity:.7">ينتهي الرابط خلال ساعتين. إذا لم تطلب ذلك فتجاهل هذه الرسالة، ولن يتغيّر شيء.</p>`),
  };
}

export function depositEmail(o: { name: string; amount: string; balance: string; siteUrl: string }) {
  return {
    subject: "تمت إضافة رصيد إلى محفظتك",
    html: shell("تمت إضافة الرصيد", `<p>مرحباً ${esc(o.name)}،</p><p>وصلت دفعتك وأُضيف <b>${esc(o.amount)}</b> إلى محفظتك.</p>
<p>رصيدك الحالي: <b>${esc(o.balance)}</b></p><p><a href="${esc(o.siteUrl)}/account">فتح حسابي</a></p>`),
  };
}
