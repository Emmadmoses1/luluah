create table currencies (
  code text primary key,
  name_en text not null,
  decimals smallint not null,
  rate_to_base numeric(18,8),
  is_active boolean not null default false
);
create table countries (
  iso2 char(2) primary key,
  name_ar text not null,
  name_en text not null,
  dial_code text not null,
  currency_code text references currencies(code),
  delivery_enabled boolean not null default false,
  sort_order int not null default 0
);
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ar text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  sku text unique not null,
  name_ar text not null,
  description_ar text not null default '',
  price_minor bigint not null check (price_minor >= 0),
  sale_price_minor bigint check (sale_price_minor >= 0),
  currency_code text not null default 'BHD' references currencies(code),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_featured boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table product_categories (
  product_id uuid references products(id) on delete cascade,
  category_id uuid references categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  path text not null,
  alt_ar text not null default '',
  sort_order int not null default 0,
  source_name text,
  source_url text,
  license_note text
);
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text unique not null,
  size text,
  color_ar text,
  stock int not null default 0 check (stock >= 0)
);
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  role text not null default 'staff' check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now()
);
create table store_settings (
  key text primary key,
  value jsonb not null
);
create index on products (status, created_at desc);
create index on product_images (product_id, sort_order);
create index on product_variants (product_id);

alter table currencies enable row level security;
alter table countries enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_categories enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table admin_users enable row level security;
alter table store_settings enable row level security;

insert into currencies (code, name_en, decimals, is_active) values
 ('BHD','Bahraini Dinar',3,true),('SAR','Saudi Riyal',2,false),('AED','UAE Dirham',2,false),
 ('KWD','Kuwaiti Dinar',3,false),('QAR','Qatari Riyal',2,false),('OMR','Omani Rial',3,false),('USD','US Dollar',2,false);
insert into countries (iso2, name_ar, name_en, dial_code, currency_code, sort_order) values
 ('BH','البحرين','Bahrain','973','BHD',1),('SA','المملكة العربية السعودية','Saudi Arabia','966','SAR',2),
 ('AE','الإمارات العربية المتحدة','United Arab Emirates','971','AED',3),('KW','الكويت','Kuwait','965','KWD',4),
 ('QA','قطر','Qatar','974','QAR',5),('OM','عُمان','Oman','968','OMR',6),('YE','اليمن','Yemen','967',null,7),
 ('IQ','العراق','Iraq','964',null,8),('JO','الأردن','Jordan','962',null,9),('PS','فلسطين','Palestine','970',null,10),
 ('LB','لبنان','Lebanon','961',null,11),('SY','سوريا','Syria','963',null,12),('EG','مصر','Egypt','20',null,13),
 ('SD','السودان','Sudan','249',null,14),('LY','ليبيا','Libya','218',null,15),('TN','تونس','Tunisia','216',null,16),
 ('DZ','الجزائر','Algeria','213',null,17),('MA','المغرب','Morocco','212',null,18),('MR','موريتانيا','Mauritania','222',null,19),
 ('SO','الصومال','Somalia','252',null,20),('DJ','جيبوتي','Djibouti','253',null,21),('KM','جزر القمر','Comoros','269',null,22);
