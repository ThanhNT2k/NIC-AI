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
      where membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and profile.account_status = 'active'
        and (
          (
            membership.organization_id = request_organization
            and request_visibility = 'organization'
            and membership.role = 'customer_admin'
          )
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
