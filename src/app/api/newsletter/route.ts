import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const p = z.object({ email: z.string().trim().toLowerCase().email().max(200) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "البريد الإلكتروني غير صالح." }, { status: 400 });
  await sql`insert into newsletter_subscribers (email) values (${p.data.email}) on conflict (email) do nothing`;
  return NextResponse.json({ ok: true });
}
