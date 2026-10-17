"use server";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { audit, createSession, getAdmin, hashPassword, verifyPassword } from "@/lib/auth";

export async function changePassword(_prev: { error?: string } | undefined, fd: FormData) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  const cur = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const again = String(fd.get("again") ?? "");

  const [row] = await sql<{ password_hash: string }[]>`
    select password_hash from admin_users where id = ${admin.id}`;
  if (!(await verifyPassword(cur, row.password_hash))) return { error: "Current password is incorrect." };
  if (next.length < 14 || next.length > 200) return { error: "New password must be 14 to 200 characters." };
  if (next !== again) return { error: "The new passwords do not match." };
  if (next === cur) return { error: "The new password must be different from the current one." };
  const low = next.toLowerCase();
  const local = admin.email.split("@")[0].toLowerCase();
  if (low.includes(local) || low.includes("luluah") || low.includes("password") || low.includes("123456")) {
    return { error: "Choose a password that does not contain your email name, the store name, or common patterns." };
  }

  const hash = await hashPassword(next);
  await sql`update admin_users set password_hash = ${hash}, must_change_password = false where id = ${admin.id}`;
  await sql`delete from admin_sessions where admin_id = ${admin.id}`;
  await createSession(admin.id);
  await audit(admin.id, "password.change");
  redirect("/admin");
}
