-- Quote history: saves each quote the user records from the profit calculator.
-- today_margin_pct is not stored here; it is computed live at read time.
create table if not exists quote_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- order parameters at save time
  destination_country text not null,
  hs_code             text not null,
  trade_term          text not null,
  quote_currency      text not null,
  quoted_amount       numeric not null,
  quantity            integer not null,
  product_cost        numeric not null,
  misc_fees           numeric not null,
  route_key           text not null,
  container_type      text not null,
  override_freight    numeric,

  -- market snapshot at save time
  saved_margin_pct  numeric not null,
  saved_profit_cny  numeric not null,
  saved_fx_rate     numeric not null,  -- CNY per foreign unit
  saved_tariff_pct  numeric not null,
  saved_freight_cny numeric not null,
  saved_rebate_pct  numeric not null,

  note text
);

-- Allow anon reads and inserts (no auth in this app)
alter table quote_history enable row level security;
create policy "allow_all" on quote_history for all using (true) with check (true);
