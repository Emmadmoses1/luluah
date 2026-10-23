import { NextResponse } from "next/server";
import { getAccount } from "@/lib/account-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const a = await getAccount();
  return NextResponse.json(
    { account: a ? { name: a.name, email: a.email, phone: a.phone ?? "" } : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
