alter table public.organization_memberships
  drop constraint if exists organization_memberships_role_check;
alter table public.organization_memberships
  add constraint organization_memberships_role_check
  check (role in ('customer_member','customer_admin','service_desk','facility_staff','facility_manager','event_staff','event_manager','security_staff','finance_manager','system_admin','auditor'));

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references public.request_drafts(id),
  owner_id uuid not null references auth.users(id),
  organization_id uuid not null references public.organizations(id),
  service_type text not null check (service_type in ('space_booking','support','event_registration','access_card')),
  title text not null check (char_length(title) between 1 and 200),
  details text not null check (char_length(details) between 1 and 10000),
  status text not null default 'submitted' check (status in ('submitted','triaged','in_progress','pending_customer','completed','rejected','cancelled')),
  target_department text not null default 'service_desk' check (target_department in ('service_desk','facility','event','security')),
  requester_role text not null,
  assigned_to uuid references auth.users(id),
  visibility text not null default 'organization' check (visibility in ('owner','organization','internal')),
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id,idempotency_key)
);

create table if not exists public.request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists service_requests_owner_scope_idx
  on public.service_requests(owner_id,organization_id,updated_at desc);
create index if not exists service_requests_team_scope_idx
  on public.service_requests(organization_id,target_department,status,updated_at desc);
create index if not exists request_comments_request_time_idx
  on public.request_comments(request_id,created_at);

create or replace function public.can_read_service_request(
  request_owner uuid,
  request_organization uuid,
  request_department text,
  request_assignee uuid,
  request_visibility text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    request_owner = (select auth.uid())
    or request_assignee = (select auth.uid())
    or exists (
      select 1
      from public.organization_memberships membership
      join public.app_profiles profile on profile.user_id = membership.user_id
      where membership.organization_id = request_organization
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and profile.account_status = 'active'
        and (
          (request_visibility = 'organization' and membership.role = 'customer_admin')
          or membership.role in ('system_admin','auditor')
          or (request_department = 'service_desk' and membership.role = 'service_desk')
          or (request_department = 'facility' and membership.role in ('facility_staff','facility_manager'))
          or (request_department = 'event' and membership.role in ('event_staff','event_manager'))
          or (request_department = 'security' and membership.role = 'security_staff')
        )
    )
  );
$$;

revoke all on function public.can_read_service_request(uuid,uuid,text,uuid,text) from public;
grant execute on function public.can_read_service_request(uuid,uuid,text,uuid,text) to authenticated;

alter table public.service_requests enable row level security;
alter table public.request_comments enable row level security;
alter table public.service_requests force row level security;
alter table public.request_comments force row level security;

create policy "request scoped read"
on public.service_requests
for select
to authenticated
using (
  public.can_read_service_request(owner_id,organization_id,target_department,assigned_to,visibility)
);

create policy "comment scoped read"
on public.request_comments
for select
to authenticated
using (
  exists (
    select 1
    from public.service_requests request
    where request.id = request_id
      and public.can_read_service_request(
        request.owner_id,
        request.organization_id,
        request.target_department,
        request.assigned_to,
        request.visibility
      )
  )
);

revoke insert,update,delete on public.service_requests,public.request_comments from anon,authenticated;
