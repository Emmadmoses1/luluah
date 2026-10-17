import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen md:flex">
      <aside className="md:w-56 bg-neutral-900 text-neutral-100 p-4">
        <p className="font-semibold">Luluah Admin</p>
        <nav className="mt-4 flex md:flex-col gap-4 text-sm">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/products">Products</Link>
          <Link href="/admin/categories">Categories</Link>
          <Link href="/admin/change-password">Change password</Link>
        </nav>
        <p className="mt-6 text-xs opacity-60 break-all">{admin.email} ({admin.role})</p>
        <form action={logout}><button className="mt-2 text-sm underline">Logout</button></form>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
