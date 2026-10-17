import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import ChangeForm from "./ChangeForm";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return <main className="min-h-screen flex items-center justify-center p-4"><ChangeForm forced={admin.mustChange} /></main>;
}
