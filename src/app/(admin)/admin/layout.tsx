import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../../globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });
export const metadata: Metadata = { title: "Luluah Admin", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.className} bg-[#f6f4ef] text-neutral-900 antialiased`}>{children}</body>
    </html>
  );
}
