alter table orders add column if not exists reminder_sent_at timestamptz;
alter table orders add column if not exists invoice_no bigint;
alter table orders add column if not exists invoice_sent_at timestamptz;
create sequence if not exists invoice_seq start 1001;
create unique index if not exists orders_invoice_no_key on orders (invoice_no) where invoice_no is not null;

create table if not exists email_log (
  id bigserial primary key,
  order_id uuid references orders(id) on delete set null,
  kind text not null,
  to_masked text not null,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists email_log_created_idx on email_log (created_at desc);
alter table email_log enable row level security;

create table if not exists job_runs (
  name text primary key,
  last_run_at timestamptz not null default now(),
  summary text
);
alter table job_runs enable row level security;
