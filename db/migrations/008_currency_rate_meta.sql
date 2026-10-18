alter table currencies add column if not exists rate_updated_at timestamptz;
alter table currencies add column if not exists rate_source text;
update currencies set rate_source = 'seed (official USD peg)'
  where rate_to_base is not null and rate_source is null;
