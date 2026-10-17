import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

const NAV: [string, string, string][] = [
  ["/admin", "Dashboard", "M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10"],
  ["/admin/products", "Products", "M4 7l8-4 8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10"],
  ["/admin/categories", "Categories", "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z"],
  ["/admin/orders", "Orders", "M6 3h12l2 5v13H4V8l2-5zM4 8h16M9 12h6"],
  ["/admin/shipping", "Shipping", "M3 7h11v9H3zM14 10h4l3 3v3h-7"],
  ["/admin/change-password", "Change password", "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen lg:flex">
      <aside className="lg:w-64 lg:min-h-screen lg:sticky lg:top-0 lg:self-start bg-[#0c0a09] text-neutral-200 p-4 lg:p-5 flex flex-col">
        <div className="flex items-center gap-3 lg:mb-8">
          <span className="w-10 h-10 rounded-full grid place-items-center text-[#0c0a09] font-bold text-lg" style={{ background: "radial-gradient(circle at 30% 25%, #fff, #e2d2b0 60%, #b79a62)" }}>L</span>
          <div className="leading-tight">
            <p className="font-semibold text-[#c9a96e]">Luluah</p>
            <p className="text-[11px] uppercase tracking-widest text-neutral-500">Admin Console</p>
          </div>
        </div>
        <nav className="mt-4 lg:mt-0 flex lg:flex-col gap-1 overflow-x-auto text-sm">
          {NAV.map(([href, label, d]) => (
            <Link key={href} href={href} className="group flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-neutral-400 hover:bg-white/5 hover:text-[#c9a96e] transition-all duration-300">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:scale-110 transition-transform"><path d={d} /></svg>
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 lg:mt-auto pt-4 border-t border-white/10">
          <p className="text-xs text-neutral-500 break-all">{admin.email}</p>
          <p className="text-[11px] uppercase tracking-wider text-[#a8864a]">{admin.role}</p>
          <form action={logout}><button className="mt-3 w-full text-sm rounded-lg border border-white/15 py-2 hover:bg-[#c9a96e] hover:text-[#0c0a09] transition-colors">Logout</button></form>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 lg:p-10 min-w-0">{children}</main>
    </div>
  );
}
