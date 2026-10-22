"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/auth";
import { getSettings, safeUrl, saveSetting, type StoreSettings } from "@/lib/settings";

const s = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

export async function saveStoreSettings(fd: FormData) {
  const admin = await requireAdmin(["owner", "manager"]);
  const bad = (f: string): never => redirect(`/admin/settings?error=${f}`);

  const contact_email = s(fd, "contact_email", 120);
  if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) bad("email");
  const contact_phone = s(fd, "contact_phone", 30);
  if (contact_phone && !/^[+0-9 ()-]{5,30}$/.test(contact_phone)) bad("phone");
  const whatsapp = s(fd, "whatsapp", 30);
  if (whatsapp && !/^\+?[0-9 ]{6,20}$/.test(whatsapp)) bad("whatsapp");

  const social: Partial<StoreSettings> = {};
  for (const k of ["instagram", "x", "tiktok", "snapchat", "facebook"] as const) {
    const v = s(fd, k, 300);
    if (v && !safeUrl(v)) bad(k);
    social[k] = v;
  }
  const days = Number(s(fd, "return_days", 3));
  if (!Number.isInteger(days) || days < 0 || days > 90) bad("days");
  const minQ = Number(s(fd, "min_order_qty", 7)), maxQ = Number(s(fd, "max_order_qty", 7));
  if (!Number.isInteger(minQ) || !Number.isInteger(maxQ) || minQ < 1 || maxQ > 100000 || minQ > maxQ) bad("qty");

  const { store } = await getSettings();
  const next: StoreSettings = {
    ...store, ...social,
    announcement_ar: s(fd, "announcement_ar", 200), contact_email, contact_phone, whatsapp,
    address_ar: s(fd, "address_ar", 300), hours_ar: s(fd, "hours_ar", 200),
    legal_name_ar: s(fd, "legal_name_ar", 150), tax_number: s(fd, "tax_number", 40),
    return_days: days, min_order_qty: minQ, max_order_qty: maxQ, show_demo_notice: fd.get("show_demo_notice") === "on",
  };
  await saveSetting("store", next);
  await audit(admin.id, "settings.store.update", { fields: Object.keys(next) });
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}
