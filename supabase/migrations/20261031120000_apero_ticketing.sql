-- APÉRO Festival · kaartverkoop
-- Kopie van de live NvdW-ticketing (stand 31 okt 2026), met:
--   * alles onder een apero_-prefix in hetzelfde Supabase-project, zodat
--     NvdW nergens geraakt wordt
--   * vier festivaldagen: donderdag t/m zondag
--   * ordernummers APR-XXXXXX
-- Alleen de service role (edge functions apero-*) leest en schrijft;
-- RLS staat aan zonder policies, dus anon/authenticated zien niets.

create extension if not exists citext;

-- ===== typen =====
create type apero_day_code as enum ('thu','fri','sat','sun');
create type apero_order_status as enum ('pending','paid','expired','canceled','failed','refunded');
create type apero_ticket_status as enum ('valid','void');
create type apero_scan_result as enum ('admitted','already_used','wrong_day','invalid_code','void','wrong_category');

-- ===== codes =====
create or replace function apero_code() returns text
language plpgsql set search_path = public, extensions, pg_temp as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  b bytea := extensions.gen_random_bytes(20);
  v_out text := '';
  i int;
begin
  for i in 0..19 loop
    v_out := v_out || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return v_out;
end $$;

-- ===== tabellen =====
create table apero_app_config (key text primary key, value text not null);

create table apero_inventory (
  day apero_day_code primary key,
  capacity integer not null check (capacity >= 0),
  sold integer not null default 0,
  check (sold >= 0 and sold <= capacity)
);

create table apero_ticket_types (
  id text primary key,
  name_nl text not null,
  name_en text not null,
  price_cents integer not null check (price_cents >= 0),
  vat_rate numeric(4,2) not null default 9.00,
  active boolean not null default true,
  sort_order integer not null default 0,
  max_per_order integer not null default 10,
  admits_count integer not null default 1 check (admits_count >= 1),
  valid_days apero_day_code[] not null,
  stock_days apero_day_code[] not null,
  per_type_cap integer,
  per_type_sold integer not null default 0,
  description_nl text not null default '',
  description_en text not null default '',
  family text,
  sale_state text not null default 'available' check (sale_state in ('available','sold_out','coming_soon')),
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  category text not null default 'access' check (category in ('access','extra','crew')),
  public boolean not null default true,
  check (per_type_cap is null or (per_type_sold >= 0 and per_type_sold <= per_type_cap))
);

create table apero_discount_codes (
  id bigint generated always as identity primary key,
  code citext not null unique,
  kind text not null check (kind in ('percent','fixed_cents')),
  value integer not null check (value > 0),
  applies_to text[],
  max_uses integer,
  used_count integer not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true,
  max_tickets integer check (max_tickets is null or max_tickets > 0),
  ticket_scope text not null default 'all' check (ticket_scope in ('all','access'))
);

create or replace function apero_short_ref() returns text
language plpgsql set search_path = public, extensions, pg_temp as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  b bytea; v text; i int; attempt int := 0;
begin
  loop
    b := extensions.gen_random_bytes(6);
    v := 'APR-';
    for i in 0..5 loop
      v := v || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from apero_orders where short_ref = v);
    attempt := attempt + 1;
    exit when attempt > 10;
  end loop;
  return v;
end $$;

create table apero_orders (
  id uuid primary key default gen_random_uuid(),
  short_ref text not null unique,
  status apero_order_status not null default 'pending',
  buyer_email citext not null,
  buyer_name text not null,
  locale text not null default 'nl' check (locale in ('nl','en')),
  channel text not null default 'web' check (channel in ('web','comp','partner','viltje')),
  total_cents integer not null check (total_cents >= 0),
  service_fee_cents integer not null default 0,
  service_fee_vat_rate numeric(4,2) not null default 9.00,
  currency text not null default 'EUR',
  discount_code_id bigint references apero_discount_codes(id),
  discount_cents integer not null default 0,
  mollie_payment_id text unique,
  checkout_url text,
  order_token text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  client_ip inet,
  expires_at timestamptz not null default (now() + interval '40 minutes'),
  paid_at timestamptz,
  refunded_at timestamptz,
  email_status text not null default 'none' check (email_status in ('none','sent','failed','skipped')),
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  custom_data jsonb not null default '{}',
  transaction_fee_cents integer not null default 0,
  reminder_sent_at timestamptz,
  reminder_count integer not null default 0,
  attribution jsonb not null default '{}',
  refunded_cents integer,
  client_user_agent text,
  note text
);
alter table apero_orders alter column short_ref set default apero_short_ref();
create index apero_orders_email_idx on apero_orders (buyer_email);
create index apero_orders_pending_idx on apero_orders (expires_at) where status = 'pending';
create index apero_orders_created_idx on apero_orders (created_at desc);
create index apero_orders_discount_idx on apero_orders (discount_code_id) where discount_code_id is not null;

create table apero_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references apero_orders(id) on delete cascade,
  ticket_type_id text not null references apero_ticket_types(id),
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null,
  vat_rate numeric(4,2) not null
);
create index apero_order_items_order_idx on apero_order_items (order_id);
create index apero_order_items_type_idx on apero_order_items (ticket_type_id);

create table apero_tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references apero_orders(id),
  order_item_id bigint not null references apero_order_items(id),
  ticket_type_id text not null references apero_ticket_types(id),
  code text not null unique default apero_code(),
  status apero_ticket_status not null default 'valid',
  valid_days apero_day_code[] not null,
  admitted_days apero_day_code[] not null default '{}',
  created_at timestamptz not null default now(),
  holder_name text,
  custom_data jsonb not null default '{}',
  holder_email text,
  ticket_token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  personalized boolean not null default false
);
create index apero_tickets_order_idx on apero_tickets (order_id);
create index apero_tickets_order_item_idx on apero_tickets (order_item_id);
create index apero_tickets_type_idx on apero_tickets (ticket_type_id);
create index apero_tickets_token_idx on apero_tickets (ticket_token);

create table apero_scanner_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  login text not null unique,
  pin_hash text not null,
  categories text[] not null default '{entree}',
  days apero_day_code[] not null default '{thu,fri,sat,sun}',
  active boolean not null default true,
  failed_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table apero_scans (
  id bigint generated always as identity primary key,
  scanned_at timestamptz not null default now(),
  code_input text not null,
  ticket_id uuid references apero_tickets(id),
  device_label text not null,
  day apero_day_code,
  result apero_scan_result not null,
  offline boolean not null default false,
  meta jsonb,
  scanner_user_id uuid,
  category text,
  test boolean not null default false
);
create index apero_scans_day_idx on apero_scans (day, scanned_at);
create index apero_scans_ticket_idx on apero_scans (ticket_id);

create table apero_scan_test_admits (
  ticket_id uuid not null,
  day apero_day_code not null,
  admitted_at timestamptz not null default now(),
  scanner_user_id uuid,
  primary key (ticket_id, day)
);

create table apero_payment_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  order_id uuid references apero_orders(id),
  mollie_payment_id text,
  mollie_status text not null,
  source text not null check (source in ('created','webhook','sweeper','manual')),
  note text
);
create index apero_payment_events_time_idx on apero_payment_events (occurred_at desc);
create index apero_payment_events_order_idx on apero_payment_events (order_id, occurred_at desc);

create table apero_rate_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  ip inet not null,
  at timestamptz not null default now()
);
create index apero_rate_events_idx on apero_rate_events (bucket, ip, at);

create table apero_form_fields (
  id bigint generated always as identity primary key,
  key text not null unique check (key ~ '^[a-z0-9_]{2,40}$'),
  scope text not null check (scope in ('order','ticket')),
  label_nl text not null,
  label_en text not null,
  type text not null check (type in ('text','number','date','select','checkbox')),
  options text[],
  required boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  applies_to text[]
);

create table apero_email_optout (email citext primary key, created_at timestamptz not null default now());

create table apero_waitlist (
  id uuid primary key default gen_random_uuid(),
  ticket_type_id text not null references apero_ticket_types(id) on delete cascade,
  email text not null,
  name text,
  qty integer not null default 1 check (qty between 1 and 50),
  locale text not null default 'nl',
  source text not null default 'shop',
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  converted_at timestamptz
);
create unique index apero_waitlist_type_email on apero_waitlist (ticket_type_id, lower(email));
create index apero_waitlist_type_idx on apero_waitlist (ticket_type_id);

do $$
declare t text;
begin
  foreach t in array array['apero_app_config','apero_inventory','apero_ticket_types','apero_discount_codes','apero_orders',
    'apero_order_items','apero_tickets','apero_scanner_users','apero_scans','apero_scan_test_admits','apero_payment_events',
    'apero_rate_events','apero_form_fields','apero_email_optout','apero_waitlist']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;

-- ===== voorraad en orders =====
create or replace function apero_rate_check(p_bucket text, p_ip inet, p_limit integer, p_window interval) returns boolean
language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_count int;
begin
  insert into apero_rate_events (bucket, ip) values (p_bucket, p_ip);
  select count(*)::int into v_count from apero_rate_events
   where bucket = p_bucket and ip = p_ip and at > now() - p_window;
  return v_count <= p_limit;
end $$;

create or replace function apero_reserve_order_stock(p_order_id uuid) returns void
language plpgsql set search_path = public, extensions, pg_temp as $$
declare r record; v_day apero_day_code; v_units int; v_n int;
begin
  for r in
    select oi.ticket_type_id, sum(oi.quantity)::int as qty, tt.per_type_cap
    from apero_order_items oi join apero_ticket_types tt on tt.id = oi.ticket_type_id
    where oi.order_id = p_order_id and tt.per_type_cap is not null
    group by oi.ticket_type_id, tt.per_type_cap
  loop
    update apero_ticket_types set per_type_sold = per_type_sold + r.qty
     where id = r.ticket_type_id and per_type_sold + r.qty <= per_type_cap;
    get diagnostics v_n = row_count;
    if v_n = 0 then raise exception 'SOLD_OUT_TYPE:%', r.ticket_type_id; end if;
  end loop;

  for v_day, v_units in
    select d.day, sum(oi.quantity * tt.admits_count)::int
    from apero_order_items oi
    join apero_ticket_types tt on tt.id = oi.ticket_type_id
    cross join lateral unnest(tt.stock_days) as d(day)
    where oi.order_id = p_order_id
    group by d.day
  loop
    update apero_inventory set sold = sold + v_units where day = v_day and sold + v_units <= capacity;
    get diagnostics v_n = row_count;
    if v_n = 0 then raise exception 'SOLD_OUT:%', v_day; end if;
  end loop;
end $$;

create or replace function apero_release_tickets_stock(p_ticket_ids uuid[]) returns void
language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if p_ticket_ids is null or cardinality(p_ticket_ids) = 0 then return; end if;
  update apero_inventory inv set sold = greatest(0, inv.sold - x.units)
    from (
      select d.day, count(*)::int as units
      from apero_tickets t
      join apero_ticket_types tt on tt.id = t.ticket_type_id
      cross join lateral unnest(tt.stock_days) as d(day)
      where t.id = any(p_ticket_ids)
      group by d.day
    ) x
   where inv.day = x.day;
  update apero_ticket_types tt set per_type_sold = greatest(0, tt.per_type_sold - x.n)
    from (select ticket_type_id, count(*)::int as n from apero_tickets where id = any(p_ticket_ids) group by ticket_type_id) x
   where tt.id = x.ticket_type_id and tt.per_type_cap is not null;
end $$;

create or replace function apero_release_order_stock(p_order_id uuid) returns void
language plpgsql set search_path = public, extensions, pg_temp as $$
begin
  if exists (select 1 from apero_tickets where order_id = p_order_id) then
    update apero_inventory inv set sold = greatest(0, inv.sold - x.units)
      from (
        select d.day, count(*)::int as units
        from apero_tickets t
        join apero_ticket_types tt on tt.id = t.ticket_type_id
        cross join lateral unnest(tt.stock_days) as d(day)
        where t.order_id = p_order_id
        group by d.day
      ) x
     where inv.day = x.day;
    update apero_ticket_types tt set per_type_sold = greatest(0, tt.per_type_sold - x.n)
      from (select ticket_type_id, count(*)::int as n from apero_tickets where order_id = p_order_id group by ticket_type_id) x
     where tt.id = x.ticket_type_id and tt.per_type_cap is not null;
  else
    update apero_ticket_types tt set per_type_sold = greatest(0, tt.per_type_sold - x.qty)
      from (select oi.ticket_type_id, sum(oi.quantity)::int as qty from apero_order_items oi where oi.order_id = p_order_id group by oi.ticket_type_id) x
     where tt.id = x.ticket_type_id and tt.per_type_cap is not null;
    update apero_inventory inv set sold = greatest(0, inv.sold - x.units)
      from (
        select d.day, sum(oi.quantity * tt.admits_count)::int as units
        from apero_order_items oi
        join apero_ticket_types tt on tt.id = oi.ticket_type_id
        cross join lateral unnest(tt.stock_days) as d(day)
        where oi.order_id = p_order_id
        group by d.day
      ) x
     where inv.day = x.day;
  end if;
end $$;

create or replace function apero_release_discount(p_id bigint) returns void
language sql set search_path = public, extensions, pg_temp as $$
  update apero_discount_codes set used_count = greatest(0, used_count - 1) where id = p_id;
$$;

create or replace function apero_release_order(p_order_id uuid, p_status apero_order_status) returns boolean
language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_n int; v_discount bigint;
begin
  if p_status not in ('expired','canceled','failed') then raise exception 'INVALID_RELEASE_STATUS:%', p_status; end if;
  update apero_orders set status = p_status where id = p_order_id and status = 'pending'
  returning discount_code_id into v_discount;
  get diagnostics v_n = row_count;
  if v_n = 0 then return false; end if;
  perform apero_release_order_stock(p_order_id);
  if v_discount is not null then perform apero_release_discount(v_discount); end if;
  return true;
end $$;

create or replace function apero_confirm_order_paid(p_order_id uuid) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_order apero_orders%rowtype; v_new boolean := false; v_tickets jsonb;
begin
  select * into v_order from apero_orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.status = 'paid' then
    v_new := false;
  elsif v_order.status = 'pending' then
    update apero_orders set status = 'paid', paid_at = now() where id = p_order_id;
    v_new := true;
  elsif v_order.status in ('expired','canceled','failed') then
    perform apero_reserve_order_stock(p_order_id);
    update apero_orders set status = 'paid', paid_at = now() where id = p_order_id;
    v_new := true;
  else
    raise exception 'ORDER_REFUNDED';
  end if;

  if v_new then
    insert into apero_tickets (order_id, order_item_id, ticket_type_id, valid_days, holder_name, custom_data)
    select oi.order_id, oi.id, oi.ticket_type_id, tt.valid_days,
           nullif(ans.fields->>'holder_name',''), coalesce(ans.fields, '{}'::jsonb)
    from apero_order_items oi
    join apero_ticket_types tt on tt.id = oi.ticket_type_id
    cross join lateral generate_series(1, oi.quantity * tt.admits_count) as g(seq)
    left join lateral (
      select a->'fields' as fields
      from jsonb_array_elements(coalesce(v_order.custom_data->'tickets', '[]'::jsonb)) a
      where a->>'type_id' = oi.ticket_type_id and (a->>'seq')::int = g.seq
      limit 1
    ) ans on true
    where oi.order_id = p_order_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'ticket_type_id', t.ticket_type_id,
           'valid_days', t.valid_days, 'status', t.status, 'holder_name', t.holder_name)
         order by t.created_at, t.code), '[]'::jsonb)
    into v_tickets from apero_tickets t where t.order_id = p_order_id;
  return jsonb_build_object('newly_paid', v_new, 'tickets', v_tickets);
end $$;

create or replace function apero_mark_order_refunded(p_order_id uuid) returns boolean
language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_n int; v_ids uuid[];
begin
  update apero_orders set status = 'refunded', refunded_at = now() where id = p_order_id and status = 'paid';
  get diagnostics v_n = row_count;
  if v_n = 0 then return false; end if;
  if exists (select 1 from apero_tickets where order_id = p_order_id) then
    with upd as (update apero_tickets set status = 'void' where order_id = p_order_id and status = 'valid' returning id)
    select coalesce(array_agg(id), '{}') into v_ids from upd;
    perform apero_release_tickets_stock(v_ids);
  else
    perform apero_release_order_stock(p_order_id);
  end if;
  return true;
end $$;

create or replace function apero_void_tickets(p_order_id uuid, p_ticket_ids uuid[] default null) returns integer
language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_ids uuid[];
begin
  perform 1 from apero_orders where id = p_order_id and status = 'paid' for update;
  if not found then raise exception 'ORDER_NOT_PAID'; end if;
  with upd as (
    update apero_tickets set status = 'void'
     where order_id = p_order_id and status = 'valid' and (p_ticket_ids is null or id = any(p_ticket_ids))
    returning id
  ) select coalesce(array_agg(id), '{}') into v_ids from upd;
  perform apero_release_tickets_stock(v_ids);
  return cardinality(v_ids);
end $$;

create or replace function apero_refund_tickets(p_order_id uuid, p_ticket_ids uuid[], p_amount_cents integer) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp as $$
declare v_ids uuid[]; v_left int;
begin
  perform 1 from apero_orders where id = p_order_id and status = 'paid' for update;
  if not found then raise exception 'ORDER_NOT_PAID'; end if;
  with upd as (
    update apero_tickets set status = 'void'
     where order_id = p_order_id and status = 'valid' and id = any(p_ticket_ids)
    returning id
  ) select coalesce(array_agg(id), '{}') into v_ids from upd;
  perform apero_release_tickets_stock(v_ids);
  update apero_orders set refunded_cents = coalesce(refunded_cents, 0) + greatest(p_amount_cents, 0) where id = p_order_id;
  select count(*) into v_left from apero_tickets where order_id = p_order_id and status = 'valid';
  if v_left = 0 then update apero_orders set status = 'refunded', refunded_at = now() where id = p_order_id; end if;
  return jsonb_build_object('voided', cardinality(v_ids), 'tickets_left', v_left);
end $$;

create or replace function apero_ticket_refund_quote(p_order_id uuid, p_ticket_ids uuid[]) returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  with o as (select * from apero_orders where id = p_order_id),
  sub as (select coalesce(sum(oi.quantity * oi.unit_price_cents), 0)::numeric as subtotal from apero_order_items oi where oi.order_id = p_order_id),
  alle as (select count(*)::numeric as n, count(*) filter (where status = 'valid') as n_valid from apero_tickets where order_id = p_order_id),
  t as (
    select tk.id, tk.status, (oi.unit_price_cents::numeric / greatest(tt.admits_count, 1)) as prijs
    from apero_tickets tk
    join apero_order_items oi on oi.id = tk.order_item_id
    join apero_ticket_types tt on tt.id = tk.ticket_type_id
    where tk.order_id = p_order_id and tk.id = any(p_ticket_ids)
  ),
  calc as (
    select
      (select count(*) from t where status = 'valid') as n_sel,
      greatest(0, round((select coalesce(sum(prijs), 0) from t where status = 'valid')
        * (1 - case when (select subtotal from sub) > 0 then (select coalesce(discount_cents, 0) from o) / (select subtotal from sub) else 0 end)))::int as excl,
      case when (select n from alle) > 0 then round(
        (select coalesce(service_fee_cents, 0) + coalesce(transaction_fee_cents, 0) from o)
        * (select count(*) from t where status = 'valid') / (select n from alle))::int else 0 end as fees,
      (select total_cents - coalesce(refunded_cents, 0) from o) as remaining
  )
  select jsonb_build_object(
    'tickets_found', (select count(*) from t), 'tickets_valid', n_sel,
    'suggested_cents', least(excl, remaining), 'fees_share_cents', fees,
    'suggested_incl_cents', case when n_sel = (select n_valid from alle) then remaining else least(excl + fees, remaining) end,
    'all_remaining', n_sel = (select n_valid from alle), 'remaining_cents', remaining,
    'status', (select status from o), 'channel', (select channel from o),
    'mollie_payment_id', (select mollie_payment_id from o)
  ) from calc
$$;

-- ===== kortingscodes =====
create or replace function apero_peek_discount(p_code citext) returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object('id', d.id, 'kind', d.kind, 'value', d.value,
    'applies_to', d.applies_to, 'max_tickets', d.max_tickets, 'ticket_scope', d.ticket_scope)
  from apero_discount_codes d
  where d.code = p_code and d.active
    and (d.valid_from is null or d.valid_from <= now())
    and (d.valid_until is null or d.valid_until >= now())
    and (d.max_uses is null or d.used_count < d.max_uses);
$$;

create or replace function apero_claim_discount(p_code citext) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp as $$
declare r record;
begin
  update apero_discount_codes set used_count = used_count + 1
   where code = p_code and active
     and (valid_from is null or valid_from <= now())
     and (valid_until is null or valid_until >= now())
     and (max_uses is null or used_count < max_uses)
  returning id, kind, value, applies_to, max_tickets, ticket_scope into r;
  if not found then return null; end if;
  return jsonb_build_object('id', r.id, 'kind', r.kind, 'value', r.value,
    'applies_to', r.applies_to, 'max_tickets', r.max_tickets, 'ticket_scope', r.ticket_scope);
end $$;

-- ===== dag wisselen (zelfservice) =====
create or replace function apero_swap_ticket_day(p_order_id uuid, p_code text, p_target apero_day_code) returns jsonb
language plpgsql set search_path = public, extensions, pg_temp as $$
declare
  v_t apero_tickets%rowtype; v_src apero_day_code;
  v_src_type apero_ticket_types%rowtype; v_tgt_type apero_ticket_types%rowtype; v_n int;
begin
  select * into v_t from apero_tickets where code = p_code and order_id = p_order_id for update;
  if not found then raise exception 'TICKET_NOT_FOUND'; end if;
  if v_t.status <> 'valid' then raise exception 'NOT_VALID'; end if;
  if array_length(v_t.admitted_days, 1) is not null then raise exception 'ALREADY_SCANNED'; end if;
  if array_length(v_t.valid_days, 1) <> 1 then raise exception 'NOT_SINGLE_DAY'; end if;
  v_src := v_t.valid_days[1];
  if v_src = p_target then raise exception 'SAME_DAY'; end if;
  select * into v_src_type from apero_ticket_types where id = v_t.ticket_type_id;
  select * into v_tgt_type from apero_ticket_types
   where family = v_src_type.family and active
     and valid_days = array[p_target]::apero_day_code[] and stock_days = array[p_target]::apero_day_code[]
     and price_cents = v_src_type.price_cents and admits_count = v_src_type.admits_count
   limit 1;
  if not found then raise exception 'NO_TARGET_TYPE'; end if;
  update apero_inventory set sold = sold + 1 where day = p_target and sold + 1 <= capacity;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'SOLD_OUT:%', p_target; end if;
  update apero_inventory set sold = greatest(0, sold - 1) where day = v_src;
  if v_src_type.per_type_cap is not null then
    update apero_ticket_types set per_type_sold = greatest(0, per_type_sold - 1) where id = v_src_type.id;
  end if;
  if v_tgt_type.per_type_cap is not null then
    update apero_ticket_types set per_type_sold = per_type_sold + 1 where id = v_tgt_type.id and per_type_sold + 1 <= per_type_cap;
    get diagnostics v_n = row_count;
    if v_n = 0 then raise exception 'SOLD_OUT:%', p_target; end if;
  end if;
  update apero_tickets set ticket_type_id = v_tgt_type.id, valid_days = array[p_target]::apero_day_code[] where id = v_t.id;
  return jsonb_build_object('ok', true, 'from', v_src, 'to', p_target, 'name_nl', v_tgt_type.name_nl, 'name_en', v_tgt_type.name_en);
end $$;

-- ===== scannen =====
create or replace function apero_ticket_scan_category(p_type text) returns text
language sql immutable as $$
  select case when p_type like 'tafel%' then 'tafel' when p_type like 'ws\_%' then 'workshop' else 'entree' end
$$;

create or replace function apero_scan_ticket_v2(p_code text, p_day apero_day_code, p_user uuid, p_categories text[], p_device text, p_test boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_t apero_tickets%rowtype; v_tt apero_ticket_types%rowtype; v_cat text; v_result apero_scan_result;
  v_first_at timestamptz; v_first_user uuid; v_first_name text; v_admitted int; v_valid int;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_t from apero_tickets where code = p_code;
  if not found then
    v_result := 'invalid_code';
  else
    select * into v_tt from apero_ticket_types where id = v_t.ticket_type_id;
    v_cat := apero_ticket_scan_category(v_t.ticket_type_id);
    if not (v_cat = any(p_categories)) then v_result := 'wrong_category';
    elsif v_t.status <> 'valid' then v_result := 'void';
    elsif not (p_day = any(v_t.valid_days)) then v_result := 'wrong_day';
    elsif p_test then
      insert into apero_scan_test_admits (ticket_id, day, admitted_at, scanner_user_id)
      values (v_t.id, p_day, v_now, p_user) on conflict do nothing;
      if found then v_result := 'admitted'; else v_result := 'already_used'; end if;
    else
      update apero_tickets set admitted_days = admitted_days || p_day where id = v_t.id and not (p_day = any(admitted_days));
      if found then v_result := 'admitted'; else v_result := 'already_used'; end if;
    end if;
    if v_result = 'already_used' then
      select s.scanned_at, s.scanner_user_id into v_first_at, v_first_user from apero_scans s
       where s.ticket_id = v_t.id and s.result = 'admitted' and s.day = p_day and s.test = p_test
       order by s.scanned_at limit 1;
      if v_first_at is null and p_test then
        select admitted_at, scanner_user_id into v_first_at, v_first_user from apero_scan_test_admits where ticket_id = v_t.id and day = p_day;
      end if;
      select name into v_first_name from apero_scanner_users where id = v_first_user;
    end if;
  end if;

  insert into apero_scans (scanned_at, code_input, ticket_id, device_label, day, result, offline, scanner_user_id, category, test)
  values (v_now, p_code, v_t.id, p_device, p_day, v_result, false, p_user, v_cat, p_test);

  if v_cat is not null then
    select count(*)::int into v_admitted from apero_scans where day = p_day and result = 'admitted' and test = p_test and category = v_cat;
    select count(*)::int into v_valid from apero_tickets t
     where t.status = 'valid' and p_day = any(t.valid_days) and apero_ticket_scan_category(t.ticket_type_id) = v_cat;
  end if;

  return jsonb_build_object(
    'result', v_result, 'category', v_cat,
    'ticket', case when v_t.id is null then null else jsonb_build_object(
      'type_name', v_tt.name_nl, 'valid_days', v_t.valid_days, 'holder_name', v_t.holder_name,
      'admits', coalesce(v_tt.admits_count, 1), 'status', v_t.status) end,
    'first_scan_at', v_first_at,
    'first_scan_seconds', case when v_first_at is null then null else extract(epoch from (v_now - v_first_at))::int end,
    'first_scan_by', v_first_name,
    'first_scan_self', v_first_user is not null and v_first_user = p_user,
    'counters', jsonb_build_object('admitted_today', v_admitted, 'tickets_today', v_valid)
  );
end $$;

-- ===== dashboard =====
create or replace function apero_admin_revenue() returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select jsonb_build_object(
    'paid_total_cents', coalesce((select sum(total_cents - coalesce(refunded_cents, 0)) from apero_orders where status = 'paid' and channel = 'web'), 0),
    'refunded_total_cents', coalesce((select sum(coalesce(refunded_cents, total_cents)) from apero_orders where status = 'refunded'), 0)
                          + coalesce((select sum(refunded_cents) from apero_orders where status = 'paid' and refunded_cents > 0), 0),
    'orders_paid', (select count(*) from apero_orders where status = 'paid' and channel = 'web'),
    'service_fees_cents', coalesce((select sum(service_fee_cents) from apero_orders where status = 'paid' and channel = 'web'), 0),
    'transaction_fees_cents', coalesce((select sum(transaction_fee_cents) from apero_orders where status = 'paid' and channel = 'web'), 0),
    'vat_split', coalesce((
      select jsonb_agg(jsonb_build_object('rate', rate, 'gross_cents', gross, 'vat_cents', round(gross * rate / (100 + rate))::int))
      from (select oi.vat_rate as rate, sum(oi.quantity * oi.unit_price_cents)::int as gross
            from apero_order_items oi join apero_orders o on o.id = oi.order_id
            where o.status = 'paid' and o.channel = 'web' group by oi.vat_rate) v
    ), '[]'::jsonb)
  );
$$;

create or replace function apero_admin_sales_per_type() returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(x order by x->>'sort'), '[]'::jsonb) from (
    select jsonb_build_object(
      'type_id', tt.id, 'name_nl', tt.name_nl, 'price_cents', tt.price_cents,
      'sort', lpad(tt.sort_order::text, 4, '0'), 'family', tt.family, 'active', tt.active,
      'valid_days', to_jsonb(tt.valid_days), 'stock_days', to_jsonb(tt.stock_days), 'per_type_cap', tt.per_type_cap,
      'orders_sold', coalesce(sum(oi.quantity) filter (where o.status = 'paid'), 0),
      'admissions_sold', greatest(0, coalesce(sum(oi.quantity * tt.admits_count) filter (where o.status = 'paid'), 0)
        - coalesce((select count(*) from apero_tickets tv join apero_orders ov on ov.id = tv.order_id
                    where tv.ticket_type_id = tt.id and tv.status = 'void' and ov.status = 'paid'), 0))
    ) as x
    from apero_ticket_types tt
    left join apero_order_items oi on oi.ticket_type_id = tt.id
    left join apero_orders o on o.id = oi.order_id
    group by tt.id, tt.name_nl, tt.price_cents, tt.sort_order, tt.family, tt.active, tt.valid_days, tt.stock_days, tt.per_type_cap
  ) sub
$$;

create or replace function apero_admin_timeseries() returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  with ord as (
    select date_trunc('day', paid_at at time zone 'Europe/Amsterdam')::date as d, count(*) as n, sum(total_cents)::int as rev
    from apero_orders where status in ('paid','refunded') and channel = 'web' and paid_at is not null group by 1
  ), tix as (
    select date_trunc('day', o.paid_at at time zone 'Europe/Amsterdam')::date as d, coalesce(sum(oi.quantity * tt.admits_count),0)::int as t
    from apero_orders o join apero_order_items oi on oi.order_id = o.id join apero_ticket_types tt on tt.id = oi.ticket_type_id
    where o.status in ('paid','refunded') and o.channel = 'web' and o.paid_at is not null group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object('day', ord.d, 'orders', ord.n, 'tickets', coalesce(tix.t,0), 'revenue_cents', ord.rev) order by ord.d), '[]'::jsonb)
  from ord left join tix on tix.d = ord.d;
$$;

create or replace function apero_admin_day_breakdown() returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_object_agg(day, obj), '{}'::jsonb) from (
    select d.day, jsonb_build_object(
        'personen', count(t.id),
        'types', coalesce((
          select jsonb_agg(jsonb_build_object('type_id', x.ticket_type_id, 'name_nl', tt2.name_nl, 'count', x.n) order by tt2.sort_order)
          from (select t2.ticket_type_id, count(*) as n from apero_tickets t2
                where t2.status = 'valid' and d.day = any(t2.valid_days) group by t2.ticket_type_id) x
          join apero_ticket_types tt2 on tt2.id = x.ticket_type_id
        ), '[]'::jsonb)
      ) as obj
    from (values ('thu'::apero_day_code), ('fri'), ('sat'), ('sun')) d(day)
    left join apero_tickets t on t.status = 'valid' and d.day = any(t.valid_days)
    group by d.day
  ) g;
$$;

create or replace function apero_admin_sales_per_categorie() returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('bucket', sub.bucket, 'tickets', sub.tickets, 'omzet_cents', sub.omzet_cents, 'orders', sub.orders) order by sub.bucket), '[]'::jsonb)
  from (
    select case tt.category when 'access' then 'toegang' when 'crew' then 'crew' else 'extra' end as bucket,
      coalesce(sum(oi.quantity) filter (where o.status = 'paid'), 0) as tickets,
      coalesce(sum(oi.quantity * oi.unit_price_cents) filter (where o.status = 'paid'), 0) as omzet_cents,
      coalesce(count(distinct oi.order_id) filter (where o.status = 'paid'), 0) as orders
    from apero_ticket_types tt
    left join apero_order_items oi on oi.ticket_type_id = tt.id
    left join apero_orders o on o.id = oi.order_id
    group by 1
  ) sub
$$;

create or replace function apero_admin_sales_per_categorie_per_dag() returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('dag', pd.dag, 'bucket', pd.bucket, 'tickets', pd.tickets, 'omzet_cents', pd.omzet_cents) order by pd.dag, pd.bucket), '[]'::jsonb)
  from (
    select date_trunc('day', o.paid_at at time zone 'Europe/Amsterdam')::date as dag,
      case tt.category when 'access' then 'toegang' when 'crew' then 'crew' else 'extra' end as bucket,
      sum(oi.quantity) as tickets, sum(oi.quantity * oi.unit_price_cents) as omzet_cents
    from apero_order_items oi
    join apero_orders o on o.id = oi.order_id and o.status = 'paid' and o.paid_at is not null
    join apero_ticket_types tt on tt.id = oi.ticket_type_id
    group by 1, 2
  ) pd
$$;

create or replace function apero_admin_abandoned() returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('order_id', t.id, 'buyer_name', t.buyer_name, 'buyer_email', t.buyer_email,
    'total_cents', t.total_cents, 'created_at', t.created_at, 'reminder_sent_at', t.reminder_sent_at, 'reminder_count', t.reminder_count)
    order by t.created_at desc), '[]'::jsonb)
  from (
    select distinct on (lower(o.buyer_email)) o.id, o.buyer_name, o.buyer_email, o.total_cents, o.created_at, o.reminder_sent_at, o.reminder_count
    from apero_orders o
    where o.channel = 'web' and o.status in ('pending','expired') and coalesce(o.buyer_email,'') <> '' and o.total_cents > 0
      and o.created_at > now() - interval '30 days'
      and not exists (select 1 from apero_orders p where lower(p.buyer_email) = lower(o.buyer_email) and p.status = 'paid')
      and not exists (select 1 from apero_email_optout x where x.email = o.buyer_email)
    order by lower(o.buyer_email), o.created_at desc
  ) t;
$$;

create or replace function apero_admin_demographics() returns jsonb
language sql stable set search_path = public, extensions, pg_temp as $$
with answers as (
  select f.key, f.label_nl, f.type, lower(trim(o.custom_data->'order'->>f.key)) as val
  from apero_form_fields f join apero_orders o on o.status = 'paid'
  where f.scope = 'order' and coalesce(trim(o.custom_data->'order'->>f.key), '') <> ''
  union all
  select f.key, f.label_nl, f.type, lower(trim(t.custom_data->>f.key))
  from apero_form_fields f join apero_tickets t on t.status = 'valid'
  join apero_orders o2 on o2.id = t.order_id and o2.status = 'paid'
  where f.scope = 'ticket' and coalesce(trim(t.custom_data->>f.key), '') <> ''
),
agecalc as (
  select key, label_nl, type, val,
    case when type = 'date' and val ~ '^\d{4}-\d{2}-\d{2}$' then extract(year from age(date '2027-06-10', val::date))::int else null end as age_years
  from answers
),
bucketed as (
  select key, case when type = 'date' then 'Leeftijd' else label_nl end as label_nl,
    case
      when type = 'date' and age_years is not null then
        case when age_years < 18 then 'jonger dan 18' when age_years < 25 then '18 t/m 24' when age_years < 35 then '25 t/m 34'
             when age_years < 45 then '35 t/m 44' when age_years < 55 then '45 t/m 54' when age_years < 65 then '55 t/m 64' else '65 plus' end
      when type = 'number' and val ~ '^[0-9]{1,3}$' then
        case when val::int < 18 then 'jonger dan 18' when val::int < 25 then '18 t/m 24' when val::int < 35 then '25 t/m 34'
             when val::int < 45 then '35 t/m 44' when val::int < 55 then '45 t/m 54' when val::int < 65 then '55 t/m 64' else '65 plus' end
      when type = 'date' then null
      else val
    end as bucket
  from agecalc
),
counted as (select key, label_nl, bucket, count(*)::int as n from bucketed where bucket is not null group by key, label_nl, bucket)
select coalesce(jsonb_object_agg(key, obj), '{}'::jsonb)
from (select key, jsonb_build_object('label', label_nl, 'total', sum(n),
        'values', jsonb_agg(jsonb_build_object('value', bucket, 'count', n) order by n desc, bucket)) as obj
      from counted group by key, label_nl) g;
$$;

create or replace function apero_admin_waitlist()
returns table(ticket_type_id text, name_nl text, category text, sale_state text, people integer, seats integer, waiting integer, notified integer, last_signup timestamptz)
language sql security definer set search_path = public as $$
  select w.ticket_type_id, t.name_nl, t.category, t.sale_state, count(*)::int, coalesce(sum(w.qty), 0)::int,
    count(*) filter (where w.notified_at is null)::int, count(*) filter (where w.notified_at is not null)::int, max(w.created_at)
  from apero_waitlist w join apero_ticket_types t on t.id = w.ticket_type_id
  group by w.ticket_type_id, t.name_nl, t.category, t.sale_state
  order by 6 desc;
$$;

-- functies alleen voor de service role
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'apero\_%' and p.proname not like 'apero\_viltjes\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- ===== startdata =====
insert into apero_inventory (day, capacity) values ('thu', 1500), ('fri', 2500), ('sat', 2500), ('sun', 2000);

insert into apero_ticket_types (id, name_nl, name_en, price_cents, sort_order, max_per_order, valid_days, stock_days, family, description_nl, description_en, sale_state) values
  ('early_thu', 'Early bird donderdag', 'Early bird Thursday', 950, 10, 10, '{thu}', '{thu}', 'early', 'Toegang op donderdag..', 'Entry on Thursday..', 'available'),
  ('early_fri', 'Early bird vrijdag', 'Early bird Friday', 950, 11, 10, '{fri}', '{fri}', 'early', 'Toegang op vrijdag..', 'Entry on Friday..', 'available'),
  ('early_sat', 'Early bird zaterdag', 'Early bird Saturday', 950, 12, 10, '{sat}', '{sat}', 'early', 'Toegang op zaterdag..', 'Entry on Saturday..', 'available'),
  ('early_sun', 'Early bird zondag', 'Early bird Sunday', 950, 13, 10, '{sun}', '{sun}', 'early', 'Toegang op zondag..', 'Entry on Sunday..', 'available'),
  ('crew', 'Crew', 'Crew', 0, 99, 1, '{thu,fri,sat,sun}', '{}', null, 'Voor de mensen achter de bar.', 'For the people behind the bar.', 'available');
update apero_ticket_types set public = false where id = 'crew';
update apero_ticket_types set category = 'crew' where id = 'crew';
-- viltjestickets per dag (zelfde familie zodat dag wisselen werkt)
insert into apero_ticket_types (id, name_nl, name_en, price_cents, sort_order, max_per_order, valid_days, stock_days, family, description_nl, description_en, public)
select 'viltje_' || d, 'Viltjesticket ' || n, 'Coaster ticket ' || e, 0, 90 + o, 1, array[d]::apero_day_code[], array[d]::apero_day_code[], 'viltje',
       'Gewonnen met het viltjesspel op Nacht van de Wijn.', 'Won with the coaster game at Nacht van de Wijn.', false
from (values ('thu','donderdag','Thursday',1),('fri','vrijdag','Friday',2),('sat','zaterdag','Saturday',3),('sun','zondag','Sunday',4)) v(d,n,e,o);

insert into apero_app_config (key, value) values
  ('EVENT_NAME', 'APÉRO Festival'),
  ('EVENT_EDITION', '2027'),
  ('EVENT_DATES_NL', 'juni 2027'),
  ('EVENT_DATES_EN', 'June 2027'),
  ('EVENT_LOCATION', 'Noordsepark, Utrecht'),
  ('FESTIVAL_DATES', '{}'),
  ('SITE_BASE_URL', 'https://www.apero-culture.com'),
  ('ALLOWED_ORIGINS', 'https://www.apero-culture.nl,https://apero-culture.nl,https://www.apero-culture.com,https://apero-culture.com,http://localhost:8755,http://localhost:8762'),
  ('EMAIL_FROM', 'APÉRO Festival <tickets@send.nachtvandewijn.nl>'),
  ('REPLY_TO', 'hallo@apero-culture.nl'),
  ('BACKUP_EMAIL', 'tickets@nachtvandewijn.nl'),
  ('SERVICE_FEE_CENTS', '95'),
  ('SERVICE_FEE_MODE', 'ticket'),
  ('TRANSACTION_FEE_CENTS', '33'),
  ('SHOP_OPEN', '1'),
  ('SCAN_TEST_DAY', 'thu'),
  ('TICKET_NOTE_NL', 'De tijden per dag maken we bekend zodra het programma vaststaat.'),
  ('TICKET_NOTE_EN', 'Opening hours per day follow with the programme.'),
  ('ADMIN_KEY', encode(extensions.gen_random_bytes(24), 'hex')),
  ('SCANNER_KEY', encode(extensions.gen_random_bytes(24), 'hex')),
  ('INTERNAL_KEY', encode(extensions.gen_random_bytes(24), 'hex')),
  ('HMAC_SECRET', encode(extensions.gen_random_bytes(32), 'hex'));

insert into apero_form_fields (key, scope, label_nl, label_en, type, required, sort) values
  ('woonplaats', 'order', 'Woonplaats', 'City', 'text', false, 10),
  ('geboortedatum', 'order', 'Geboortedatum', 'Date of birth', 'date', true, 20);
