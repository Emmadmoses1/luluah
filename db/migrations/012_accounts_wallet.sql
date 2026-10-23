create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  full_name text not null default '',
  phone text,
  email_verified_at timestamptz,
  status text not null default 'active' check (status in ('active','blocked')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index if not exists accounts_email_key on accounts (email);

create table if not exists account_sessions (
  token_hash text primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists account_sessions_acct on account_sessions (account_id);

create table if not exists account_tokens (
  token_hash text primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  kind text not null check (kind in ('verify','reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  n integer not null default 1
);

create table if not exists wallets (
  account_id uuid primary key references accounts(id) on delete cascade,
  balance_minor bigint not null default 0 check (balance_minor >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists wallet_deposits (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  account_id uuid not null references accounts(id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  usd_amount numeric(12,2) not null,
  method text not null check (method in ('crypto','card')),
  status text not null default 'unpaid' check (status in ('unpaid','pending','confirming','paid','partially_paid','failed','expired','refunded')),
  provider_invoice_id text,
  provider_payment_id text,
  invoice_url text,
  pay_address text,
  pay_currency text,
  pay_amount numeric,
  actually_paid numeric,
  flagged boolean not null default false,
  note text,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wallet_deposits_acct on wallet_deposits (account_id, created_at desc);

create table if not exists wallet_transactions (
  id bigserial primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  kind text not null check (kind in ('deposit','purchase','refund','adjustment')),
  amount_minor bigint not null check (amount_minor <> 0),
  balance_after_minor bigint not null check (balance_after_minor >= 0),
  deposit_id uuid references wallet_deposits(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  note text,
  created_by uuid references admin_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_acct on wallet_transactions (account_id, created_at desc);
-- The database itself guarantees these happen only once.
create unique index if not exists wallet_tx_deposit_once on wallet_transactions (deposit_id) where kind = 'deposit';
create unique index if not exists wallet_tx_purchase_once on wallet_transactions (order_id) where kind = 'purchase';
create unique index if not exists wallet_tx_refund_once on wallet_transactions (order_id) where kind = 'refund';

alter table orders add column if not exists payment_method text;

alter table accounts enable row level security;
alter table account_sessions enable row level security;
alter table account_tokens enable row level security;
alter table rate_limits enable row level security;
alter table wallets enable row level security;
alter table wallet_deposits enable row level security;
alter table wallet_transactions enable row level security;
