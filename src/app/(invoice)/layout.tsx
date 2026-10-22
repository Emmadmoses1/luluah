import { Cairo, Amiri } from "next/font/google";
import "../globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], display: "swap", weight: ["400", "600", "700"], variable: "--font-body" });
const amiri = Amiri({ subsets: ["arabic", "latin"], display: "swap", weight: ["700"], variable: "--font-display" });

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${amiri.variable} font-[family-name:var(--font-body)] bg-neutral-100 text-ink antialiased print:bg-white`}>{children}</body>
    </html>
  );
}
