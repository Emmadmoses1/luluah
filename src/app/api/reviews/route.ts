import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";

const Body = z.object({
  slug: z.string().max(120),
  ref: z.string().max(40),
  name: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(1000).default(""),
});
const fail = (m: string, status = 400) => NextResponse.json({ error: m }, { status });

export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("البيانات المدخلة غير صحيحة.");
  let ref = p.data.ref.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (ref.length === 14 && ref.startsWith("LU")) ref = ref.slice(2);
  if (!/^[A-Z2-9]{12}$/.test(ref)) return fail("رقم الطلب غير صحيح.");

  // Only genuine, delivered, non-test orders that contain this product can leave a review.
  const [o] = await sql<{ id: string }[]>`
    select id from orders where ref = ${ref} and fulfillment_status = 'delivered' and not is_test`;
  if (!o) return fail("لا يمكن التقييم إلا بعد استلام الطلب. تحقق من رقم الطلب.");
  const [prod] = await sql<{ id: string }[]>`
    select p.id from products p where p.slug = ${p.data.slug} and p.status = 'published'
      and exists (select 1 from order_items oi join product_variants v on v.id = oi.variant_id
                  where oi.order_id = ${o.id} and v.product_id = p.id)`;
  if (!prod) return fail("هذا المنتج غير موجود ضمن هذا الطلب.");
  try {
    await sql`insert into reviews (product_id, order_id, author_name, rating, body)
              values (${prod.id}, ${o.id}, ${p.data.name}, ${p.data.rating}, ${p.data.body})`;
  } catch (e) {
    if ((e as { code?: string })?.code === "23505") return fail("سبق أن أرسلت تقييماً لهذا المنتج من هذا الطلب.", 409);
    throw e;
  }
  return NextResponse.json({ ok: true });
}
