-- Run in Supabase SQL editor. Service role key stays only in backend environment.
create table if not exists public.shop_orders (
  id uuid primary key,
  product_id text not null,
  product_name text not null,
  buyer_wallet text not null,
  treasury_wallet text not null,
  amount_lamports bigint not null check (amount_lamports > 0),
  status text not null check (status in ('pending','minting','delivered','failed')),
  payment_signature text unique,
  asset_address text unique,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
alter table public.shop_orders enable row level security;
-- No client policies: all order creation and fulfillment goes through the server only.
revoke all on public.shop_orders from anon, authenticated;
