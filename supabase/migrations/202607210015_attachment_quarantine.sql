alter table public.request_attachments
  add column if not exists scan_attempts integer not null default 0 check (scan_attempts between 0 and 10),
  add column if not exists last_scan_error text,
  add column if not exists scanned_at timestamptz;

alter table public.request_attachments alter column validation_status set default 'quarantined';

create index if not exists request_attachments_scan_queue_idx
  on public.request_attachments(validation_status,scan_attempts,created_at)
  where validation_status = 'quarantined';

revoke insert,update,delete on public.request_attachments from anon,authenticated;
