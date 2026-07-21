create table if not exists public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  object_key text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 160),
  content_type text not null check (content_type in ('application/pdf','image/png','image/jpeg','text/plain')),
  size_bytes bigint not null check (size_bytes between 1 and 8388608),
  sha256 char(64) not null,
  validation_status text not null default 'validated' check (validation_status in ('validated','rejected','quarantined')),
  created_at timestamptz not null default now()
);

create index if not exists request_attachments_request_time_idx
  on public.request_attachments(request_id,created_at);

alter table public.request_attachments enable row level security;
alter table public.request_attachments force row level security;

create policy "attachment scoped read"
on public.request_attachments
for select
to authenticated
using (
  validation_status = 'validated'
  and exists (
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

revoke insert,update,delete on public.request_attachments from anon,authenticated;
