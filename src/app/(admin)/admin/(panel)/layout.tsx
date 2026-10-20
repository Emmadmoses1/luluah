import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

const NAV: [string, string, string][] = [
  ["/admin", "Dashboard", "M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10"],
  ["/admin/products", "Products", "M4 7l8-4 8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10"],
  ["/admin/categories", "Categories", "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z"],
  ["/admin/orders", "Orders", "M6 3h12l2 5v13H4V8l2-5zM4 8h16M9 12h6"],
  ["/admin/reviews", "Reviews", "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"],
  ["/admin/discounts", "Discounts", "M20 12l-8 8-9-9V3h8l9 9zM7.5 7.5h.01"],
  ["/admin/currencies", "Currencies", "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9.5c0-1 1.3-1.8 3-1.8s3 .8 3 1.8-1.3 1.6-3 2-3 1-3 2 1.3 1.8 3 1.8 3-.8 3-1.8M12 6v1.7M12 16.3V18"],
  ["/admin/reports", "Reports", "M4 20V10M10 20V4M16 20v-7M22 20H2"],
  ["/admin/inventory", "Inventory", "M3 7l9-4 9 4v10l-9 4-9-4V7zM12 11v10M3 7l9 4 9-4"],
  ["/admin/customers", "Customers", "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 3.6-6 8-6s8 2 8 6"],
  ["/admin/users", "Admin users", "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4"],
  ["/admin/launch", "Launch checklist", "M5 21V4M5 4h11l-2 4 2 4H5"],
  ["/admin/payments", "Payment settings", "M3 7h18v12H3zM3 11h18M7 15h3"],
  ["/admin/newsletter", "Newsletter", "M3 6h18v12H3zM3 7l9 7 9-7"],
  ["/admin/postal", "Postal codes", "M3 7l9-4 9 4v10l-9 4-9-4V7zM8 11h8M8 15h5"],
  ["/admin/shipping", "Shipping", "M3 7h11v9H3zM14 10h4l3 3v3h-7"],
  ["/admin/settings", "Store Settings", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 .5-1.5-1L15 4h-4l-.5 2.5-1.5 1L7 7 5 11l2 1v1l-2 1 2 4 2-.5 1.5 1L11 20h4l.5-2.5 1.5-1 2 .5 2-4-2-1v-1z"],
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
