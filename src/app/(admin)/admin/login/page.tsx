import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return <main className="min-h-screen flex items-center justify-center p-4"><LoginForm /></main>;
}
