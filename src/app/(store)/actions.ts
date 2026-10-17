"use server";
import { cookies } from "next/headers";
import { activeCurrencies, COOKIE } from "@/lib/currency-server";

export async function setCurrency(code: string) {
  const list = await activeCurrencies();
  if (!list.some((c) => c.code === code)) return;
  (await cookies()).set(COOKIE, code, {
    path: "/", maxAge: 31536000, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production",
  });
}
