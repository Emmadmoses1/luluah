alter table countries add column if not exists postal_regex text;
alter table countries add column if not exists postal_hint text;

create table cities (
  geoname_id bigint primary key,
  country_iso2 char(2) not null references countries(iso2) on delete cascade,
  name_en text not null,
  name_ar text,
  admin_name text,
  population integer not null default 0,
  lat double precision,
  lon double precision
);
create index cities_country_pop on cities (country_iso2, population desc);

create table postal_codes (
  id bigserial primary key,
  country_iso2 char(2) not null references countries(iso2) on delete cascade,
  code text not null,
  place_name text not null,
  admin_name text,
  unique (country_iso2, code, place_name)
);
create index postal_codes_lookup on postal_codes (country_iso2, code text_pattern_ops);

alter table cities enable row level security;
alter table postal_codes enable row level security;

-- Postal formats: only countries where the format is well known. Owner must confirm before launch.
update countries set postal_regex = '^[0-9]{5}$', postal_hint = 'خمسة أرقام' where iso2 in ('SA','KW','EG','JO','IQ','MA','DZ','SD');
update countries set postal_regex = '^[0-9]{3}$', postal_hint = 'ثلاثة أرقام' where iso2 = 'OM';
update countries set postal_regex = '^[0-9]{4}$', postal_hint = 'أربعة أرقام' where iso2 = 'TN';
