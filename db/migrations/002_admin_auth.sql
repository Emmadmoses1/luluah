create table admin_sessions (
  token_hash text primary key,
  admin_id uuid not null references admin_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table login_attempts (
  id bigserial primary key,
  email text not null,
  ip text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create table audit_logs (
  id bigserial primary key,
  admin_id uuid references admin_users(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}',
  at timestamptz not null default now()
);
create index on login_attempts (email, at);
create index on login_attempts (ip, at);
create index on admin_sessions (expires_at);
alter table admin_sessions enable row level security;
alter table login_attempts enable row level security;
alter table audit_logs enable row level security;
