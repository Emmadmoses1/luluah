alter table countries
  add column fee_minor bigint not null default 0 check (fee_minor >= 0),
  add column free_over_minor bigint check (free_over_minor >= 0),
  add column min_order_minor bigint not null default 0 check (min_order_minor >= 0),
  add column eta_min_days int,
  add column eta_max_days int;

create table orders (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  fulfillment_status text not null default 'new'
    check (fulfillment_status in ('new','processing','shipped','delivered','cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','pending','confirming','paid','failed','expired','refunded')),
  is_test boolean not null default true,
  currency_code text not null default 'BHD' references currencies(code),
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  shipping_minor bigint not null check (shipping_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  country_iso2 char(2) not null references countries(iso2),
  address jsonb not null,
  notes text,
  tracking_ref text,
  admin_notes text,
  ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,
  variant_label text,
  sku text not null,
  unit_minor bigint not null check (unit_minor >= 0),
  qty int not null check (qty > 0),
  line_minor bigint not null check (line_minor >= 0)
);
create index on orders (created_at desc);
create index on orders (ip, created_at);
create index on order_items (order_id);
alter table orders enable row level security;
alter table order_items enable row level security;
