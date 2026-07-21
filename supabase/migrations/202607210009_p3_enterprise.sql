create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.app_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  account_status text not null default 'active' check (account_status in ('invited','active','suspended','deprovisioned')),
  mfa_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('customer_member','customer_admin','facility_staff','facility_manager','event_staff','event_manager','security_staff','finance_manager','system_admin','auditor')),
  status text not null default 'active' check (status in ('active','suspended','revoked')),
  created_at timestamptz not null default now(),
  unique (organization_id,user_id)
);

create table if not exists public.service_providers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  code text not null,
  name text not null,
  status text not null default 'active' check (status in ('active','inactive')),
  unique (organization_id,code)
);

create table if not exists public.provider_memberships (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.service_providers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','revoked')),
  unique (provider_id,user_id)
);

create or replace function public.is_active_org_member(target_organization uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships membership
    join public.app_profiles profile on profile.user_id = membership.user_id
    where membership.organization_id = target_organization
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and profile.account_status = 'active'
  );
$$;

create or replace function public.has_org_role(target_organization uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_memberships membership
    join public.app_profiles profile on profile.user_id = membership.user_id
    where membership.organization_id = target_organization
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and profile.account_status = 'active'
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function public.is_active_provider_member(target_provider uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.provider_memberships membership
    join public.app_profiles profile on profile.user_id = membership.user_id
    where membership.provider_id = target_provider
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and profile.account_status = 'active'
  );
$$;

revoke all on function public.is_active_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid,text[]) from public;
revoke all on function public.is_active_provider_member(uuid) from public;
grant execute on function public.is_active_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid,text[]) to authenticated;
grant execute on function public.is_active_provider_member(uuid) to authenticated;

create table if not exists public.procurement_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  provider_id uuid not null references public.service_providers(id),
  contract_number text not null,
  version integer not null check (version > 0),
  status text not null check (status in ('draft','active','expired','terminated')),
  currency char(3) not null,
  ceiling_minor bigint not null check (ceiling_minor >= 0),
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (valid_until > valid_from),
  unique (organization_id,contract_number,version)
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  provider_id uuid not null references public.service_providers(id),
  contract_id uuid references public.procurement_contracts(id),
  po_number text not null,
  version integer not null default 1,
  status text not null check (status in ('draft','pending_approval','approved','rejected','issued','partially_received','received','closed','cancelled')),
  currency char(3) not null,
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  idempotency_key text not null,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,po_number,version),
  unique (organization_id,idempotency_key),
  check (approved_by is null or approved_by <> created_by)
);

create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  line_number integer not null,
  description text not null,
  quantity_milli bigint not null check (quantity_milli > 0),
  unit text not null,
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  line_total_minor bigint not null check (line_total_minor >= 0),
  unique (purchase_order_id,line_number)
);

create table if not exists public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id),
  receipt_number text not null,
  status text not null default 'posted' check (status in ('posted','reversed')),
  idempotency_key text not null,
  received_by uuid not null references auth.users(id),
  received_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (purchase_order_id,receipt_number),
  unique (purchase_order_id,idempotency_key)
);

create table if not exists public.goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.goods_receipts(id) on delete cascade,
  purchase_order_line_id uuid not null references public.purchase_order_lines(id),
  quantity_received_milli bigint not null check (quantity_received_milli > 0),
  condition text not null check (condition in ('accepted','damaged','rejected')),
  unique (receipt_id,purchase_order_line_id)
);

create table if not exists public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id),
  organization_id uuid not null references public.organizations(id),
  provider_id uuid not null references public.service_providers(id),
  invoice_number text not null,
  status text not null check (status in ('pending_match','matched','exception','approved','rejected','paid')),
  currency char(3) not null,
  total_minor bigint not null check (total_minor >= 0),
  idempotency_key text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id,invoice_number),
  unique (provider_id,idempotency_key)
);

create table if not exists public.three_way_matches (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique references public.supplier_invoices(id),
  organization_id uuid not null references public.organizations(id),
  status text not null check (status in ('matched','exception')),
  variance_minor bigint not null,
  result_payload jsonb not null,
  matched_by uuid not null references auth.users(id),
  matched_at timestamptz not null default now()
);

create table if not exists public.procurement_exceptions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.supplier_invoices(id),
  organization_id uuid not null references public.organizations(id),
  severity text not null check (severity in ('medium','high','critical')),
  status text not null default 'open' check (status in ('open','under_review','resolved','rejected')),
  details jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.legal_holds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  entity_type text not null,
  entity_id text not null,
  reason text not null,
  status text not null default 'active' check (status in ('active','released')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.retention_job_runs (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid not null,
  dry_run boolean not null default true,
  status text not null check (status in ('running','completed','failed')),
  candidate_count integer not null default 0,
  processed_count integer not null default 0,
  held_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.observability_events (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid not null,
  trace_id text not null,
  level text not null check (level in ('info','warn','error')),
  event_name text not null,
  actor_hash text,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.operational_incidents (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid not null,
  severity text not null check (severity in ('warning','critical')),
  title text not null,
  status text not null default 'open' check (status in ('open','acknowledged','resolved')),
  runbook text not null,
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.app_profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.service_providers enable row level security;
alter table public.provider_memberships enable row level security;
alter table public.procurement_contracts enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.goods_receipts enable row level security;
alter table public.goods_receipt_lines enable row level security;
alter table public.supplier_invoices enable row level security;
alter table public.three_way_matches enable row level security;
alter table public.procurement_exceptions enable row level security;
alter table public.legal_holds enable row level security;
alter table public.retention_job_runs enable row level security;
alter table public.observability_events enable row level security;
alter table public.operational_incidents enable row level security;

alter table public.procurement_contracts force row level security;
alter table public.purchase_orders force row level security;
alter table public.purchase_order_lines force row level security;
alter table public.goods_receipts force row level security;
alter table public.goods_receipt_lines force row level security;
alter table public.supplier_invoices force row level security;
alter table public.three_way_matches force row level security;
alter table public.procurement_exceptions force row level security;

create policy "profile owner read" on public.app_profiles for select to authenticated using ((select auth.uid()) is not null and user_id=(select auth.uid()));
create policy "membership owner read" on public.organization_memberships for select to authenticated using ((select auth.uid()) is not null and user_id=(select auth.uid()));
create policy "provider membership owner read" on public.provider_memberships for select to authenticated using ((select auth.uid()) is not null and user_id=(select auth.uid()));
create policy "organization member read" on public.organizations for select to authenticated using ((select auth.uid()) is not null and public.is_active_org_member(id));
create policy "provider scoped read" on public.service_providers for select to authenticated using ((select auth.uid()) is not null and (public.is_active_org_member(organization_id) or public.is_active_provider_member(id)));
create policy "contract scoped read" on public.procurement_contracts for select to authenticated using ((select auth.uid()) is not null and (public.is_active_org_member(organization_id) or public.is_active_provider_member(provider_id)));
create policy "po scoped read" on public.purchase_orders for select to authenticated using ((select auth.uid()) is not null and (public.is_active_org_member(organization_id) or public.is_active_provider_member(provider_id)));
create policy "po line scoped read" on public.purchase_order_lines for select to authenticated using (exists (select 1 from public.purchase_orders po where po.id=purchase_order_id and (public.is_active_org_member(po.organization_id) or public.is_active_provider_member(po.provider_id))));
create policy "receipt scoped read" on public.goods_receipts for select to authenticated using (exists (select 1 from public.purchase_orders po where po.id=purchase_order_id and (public.is_active_org_member(po.organization_id) or public.is_active_provider_member(po.provider_id))));
create policy "receipt line scoped read" on public.goods_receipt_lines for select to authenticated using (exists (select 1 from public.goods_receipts receipt join public.purchase_orders po on po.id=receipt.purchase_order_id where receipt.id=receipt_id and (public.is_active_org_member(po.organization_id) or public.is_active_provider_member(po.provider_id))));
create policy "invoice scoped read" on public.supplier_invoices for select to authenticated using ((select auth.uid()) is not null and (public.has_org_role(organization_id,array['finance_manager','system_admin','auditor']) or public.is_active_provider_member(provider_id)));
create policy "match finance read" on public.three_way_matches for select to authenticated using ((select auth.uid()) is not null and public.has_org_role(organization_id,array['finance_manager','system_admin','auditor']));
create policy "exception finance read" on public.procurement_exceptions for select to authenticated using ((select auth.uid()) is not null and public.has_org_role(organization_id,array['finance_manager','system_admin','auditor']));
create policy "legal hold admin read" on public.legal_holds for select to authenticated using ((select auth.uid()) is not null and public.has_org_role(organization_id,array['system_admin','auditor']));

revoke insert,update,delete on public.procurement_contracts,public.purchase_orders,public.purchase_order_lines,public.goods_receipts,public.goods_receipt_lines,public.supplier_invoices,public.three_way_matches,public.procurement_exceptions from anon,authenticated;
revoke all on public.retention_job_runs,public.observability_events,public.operational_incidents from anon,authenticated;
revoke insert,update,delete on public.audit_logs from anon,authenticated;

create index if not exists organization_memberships_user_scope_idx on public.organization_memberships(user_id,organization_id,status);
create index if not exists provider_memberships_user_scope_idx on public.provider_memberships(user_id,provider_id,status);
create index if not exists purchase_orders_scope_idx on public.purchase_orders(organization_id,provider_id,status);
create index if not exists supplier_invoices_scope_idx on public.supplier_invoices(organization_id,provider_id,status);
