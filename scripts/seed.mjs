import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

// [slug, name_ar, active]
const cats = [
 ["abayas","العبايات",1],["hijab-shawls","الحجاب والشالات",1],["modest-dresses","الفساتين المحتشمة",1],
 ["thobes","الثياب الرجالية",1],["mens-fashion","الأزياء الرجالية",1],["womens-fashion","الأزياء النسائية",1],
 ["kids","ملابس الأطفال",1],["bags","الحقائب الفاخرة",1],["shoes","الأحذية",1],["watches","الساعات",1],
 ["jewelry","المجوهرات",1],["accessories","الإكسسوارات",1],["perfumes","العطور",1],
 ["oud-incense","البخور والعود",1],["occasions","مستلزمات المناسبات",1],["gifts","الهدايا الفاخرة",1],
 ["loungewear","الملابس المنزلية الفاخرة",1],["activewear","الملابس الرياضية المحتشمة",1],
 ["new-arrivals","أحدث الإصدارات",0],["best-sellers","الأكثر مبيعاً",0],["offers","العروض الخاصة",0],
];
for (const [i,[slug,name,active]] of cats.entries()) {
  await sql`insert into categories (slug,name_ar,sort_order,is_active)
            values (${slug},${name},${i+1},${active===1}) on conflict (slug) do nothing`;
}

const D = " (منتج تجريبي للعرض فقط)";
// [category, sku, slug, name, description, price_fils, sale_fils|null, [[size,color,stock],...]]
const items = [
 ["abayas","DEMO-ABY-001","demo-abaya-black","عباية سوداء كلاسيكية","عباءة بقصّة واسعة وقماش ناعم الملمس، مناسبة للاستخدام اليومي."+D,42000,null,[["52","أسود",6],["54","أسود",4],["56","أسود",3]]],
 ["abayas","DEMO-ABY-002","demo-abaya-beige","عباية بيج مطرزة","عباءة بلون البيج الدافئ مع تطريز ذهبي هادئ على الأكمام."+D,68000,59000,[["52","بيج",3],["54","بيج",5]]],
 ["hijab-shawls","DEMO-HJB-001","demo-shawl-ivory","شال حرير عاجي","شال خفيف بملمس حريري ولون عاجي أنيق."+D,14500,null,[["حر","عاجي",12]]],
 ["hijab-shawls","DEMO-HJB-002","demo-hijab-champagne","حجاب شيفون شامبانيا","حجاب من الشيفون الفاخر بدرجة الشامبانيا."+D,9500,null,[["حر","شامبانيا",20]]],
 ["thobes","DEMO-THB-001","demo-thobe-white","ثوب أبيض فاخر","ثوب رجالي بقماش قطني مريح وخياطة متقنة."+D,38000,null,[["54","أبيض",5],["56","أبيض",7],["58","أبيض",4]]],
 ["thobes","DEMO-THB-002","demo-thobe-grey","ثوب رمادي شتوي","ثوب بقماش دافئ مناسب للأجواء الباردة."+D,45000,40000,[["54","رمادي",3],["56","رمادي",4]]],
 ["perfumes","DEMO-PRF-001","demo-perfume-pearl","عطر اللؤلؤ","عطر شرقي هادئ بنفحات العنبر والمسك، عبوة ١٠٠ مل."+D,32000,null,[["100 مل","—",15]]],
 ["perfumes","DEMO-PRF-002","demo-perfume-night","عطر ليالي الخليج","عطر بنفحات العود والورد، عبوة ٥٠ مل."+D,27500,null,[["50 مل","—",10]]],
 ["bags","DEMO-BAG-001","demo-bag-black","حقيبة يد جلدية سوداء","حقيبة يد بتصميم عملي وتفاصيل ذهبية."+D,85000,null,[["واحد","أسود",4]]],
 ["watches","DEMO-WCH-001","demo-watch-gold","ساعة نسائية ذهبية","ساعة أنيقة بسوار معدني بلون الشامبانيا."+D,120000,null,[["واحد","ذهبي",3]]],
 ["jewelry","DEMO-JWL-001","demo-pearl-necklace","عقد لؤلؤ","عقد بتصميم كلاسيكي مستوحى من لؤلؤ الخليج."+D,56000,null,[["واحد","لؤلؤي",6]]],
 ["oud-incense","DEMO-OUD-001","demo-oud-incense","بخور عود ملكي","بخور بروائح العود الدافئة، علبة ٥٠ غرام."+D,18000,null,[["50 غ","—",14]]],
];
if (process.env.SEED_DEMO !== "1") console.log("Skipping demo products (set SEED_DEMO=1 to add them).");
for (const [cat,sku,slug,name,desc,price,sale,vars] of (process.env.SEED_DEMO === "1" ? items : [])) {
  const [p] = await sql`insert into products (slug,sku,name_ar,description_ar,price_minor,sale_price_minor,status,is_demo,is_featured)
    values (${slug},${sku},${name},${desc},${price},${sale},'published',true,true)
    on conflict (slug) do nothing returning id`;
  if (!p) { console.log("exists ", slug); continue; }
  await sql`insert into product_categories (product_id,category_id) select ${p.id}, id from categories where slug=${cat}`;
  for (const [i,[size,color,stock]] of vars.entries()) {
    await sql`insert into product_variants (product_id,sku,size,color_ar,stock) values (${p.id},${sku+"-"+(i+1)},${size},${color},${stock})`;
  }
  console.log("added  ", slug);
}
await sql.end();
