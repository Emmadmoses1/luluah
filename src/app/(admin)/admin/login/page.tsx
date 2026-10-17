import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="hero-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full border border-[#c9a96e]/20 spin-slow" />
      <LoginForm />
    </main>
  );
}
