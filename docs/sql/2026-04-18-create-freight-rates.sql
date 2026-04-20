create table if not exists freight_rates (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  route_key text not null,
  origin_port text not null,
  destination_country text not null,
  destination_port text not null,
  container_type text not null,
  baseline_freight numeric(12, 2) not null,
  source_url text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists freight_rates_date_route_key_idx
  on freight_rates (date, route_key);

create index if not exists freight_rates_route_container_date_idx
  on freight_rates (route_key, container_type, date desc);
