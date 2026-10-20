alter table products add column if not exists name_en text;
alter table products add column if not exists description_en text;
alter table product_variants add column if not exists color_en text;
alter table categories add column if not exists name_en text;

update categories c set name_en = v.en
from (values
  ('العبايات', 'Abayas'), ('الحجاب والشالات', 'Hijabs & Shawls'), ('الفساتين المحتشمة', 'Modest Dresses'),
  ('الثياب الرجالية', 'Men''s Thobes'), ('الأزياء الرجالية', 'Men''s Fashion'), ('الأزياء النسائية', 'Women''s Fashion'),
  ('ملابس الأطفال', 'Kids'' Clothing'), ('الحقائب الفاخرة', 'Luxury Bags'), ('الأحذية', 'Shoes'),
  ('الساعات', 'Watches'), ('المجوهرات', 'Jewelry'), ('الإكسسوارات', 'Accessories'), ('العطور', 'Perfumes'),
  ('البخور والعود', 'Incense & Oud'), ('مستلزمات المناسبات', 'Occasion Essentials'), ('الهدايا الفاخرة', 'Luxury Gifts'),
  ('الملابس المنزلية الفاخرة', 'Luxury Homewear'), ('الملابس الرياضية المحتشمة', 'Modest Activewear'),
  ('أحدث الإصدارات', 'New Arrivals'), ('الأكثر مبيعاً', 'Best Sellers'), ('العروض الخاصة', 'Special Offers')
) as v(ar, en)
where c.name_ar = v.ar and c.name_en is null;
