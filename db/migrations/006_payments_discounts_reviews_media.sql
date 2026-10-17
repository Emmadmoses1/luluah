-- Payments, discounts, reviews, newsletter, media library and default store settings.

alter table orders drop constraint if exists orders_payment_status_check;
alter table orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid','pending','confirming','paid','partially_paid','failed','expired','refunded'));
alter table orders
  add column discount_minor bigint not null default 0 check (discount_minor >= 0),
  add column discount_code text,
  add column stock_released boolean not null default false,
  add column paid_at timestamptz;

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,
  provider_invoice_id text,
  provider_payment_id text,
  status text not null default 'created',
  price_minor bigint not null check (price_minor >= 0),
  price_amount numeric(18,2) not null,
  price_currency text not null,
  pay_currency text,
  pay_amount numeric(38,12),
  actually_paid numeric(38,12),
  invoice_url text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payments_provider_invoice_key on payments (provider, provider_invoice_id) where provider_invoice_id is not null;
create index payments_order_idx on payments (order_id);
create index payments_payment_id_idx on payments (provider, provider_payment_id);

create table payment_events (
  id bigserial primary key,
  payment_id uuid references payments(id) on delete set null,
  provider text not null,
  event_key text not null,
  status text,
  payload jsonb not null,
  note text,
  received_at timestamptz not null default now(),
  unique (provider, event_key)
);

create table discounts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code = upper(code)),
  kind text not null check (kind in ('percent','fixed')),
  value int not null check (value > 0),
  min_order_minor bigint not null default 0 check (min_order_minor >= 0),
  max_uses int check (max_uses > 0),
  used_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  unique (product_id, order_id)
);
create index reviews_product_idx on reviews (product_id, status);

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

create table media (
  id uuid primary key default gen_random_uuid(),
  mime text not null check (mime in ('image/jpeg','image/png','image/webp')),
  size int not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

alter table payments enable row level security;
alter table payment_events enable row level security;
alter table discounts enable row level security;
alter table reviews enable row level security;
alter table newsletter_subscribers enable row level security;
alter table media enable row level security;

-- rate_to_base = units of the currency per 1 BHD (from the official USD pegs). KWD floats, so no rate.
update currencies set rate_to_base = 1 where code = 'BHD';
update currencies set rate_to_base = 2.65957447 where code = 'USD';
update currencies set rate_to_base = 9.97340426 where code = 'SAR';
update currencies set rate_to_base = 9.76728723 where code = 'AED';
update currencies set rate_to_base = 9.68085106 where code = 'QAR';
update currencies set rate_to_base = 1.02260638 where code = 'OMR';

insert into store_settings (key, value) values
 ('store', '{"announcement_ar":"","contact_email":"","contact_phone":"","whatsapp":"","address_ar":"","hours_ar":"","instagram":"","x":"","tiktok":"","snapchat":"","facebook":"","show_demo_notice":true}'::jsonb),
 ('payments', '{"crypto_enabled":true,"order_expiry_hours":24,"instructions_ar":""}'::jsonb)
on conflict (key) do nothing;
