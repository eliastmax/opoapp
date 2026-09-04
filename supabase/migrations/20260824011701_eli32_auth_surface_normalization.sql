-- ELI-32 · final explicit normalization: technical V4 executor never gets auth schema USAGE.
revoke usage on schema auth from v4_authenticated_executor;

do $assertions$
begin
  if has_schema_privilege('v4_authenticated_executor','auth','USAGE') then
    raise exception 'v4_authenticated_executor must not have USAGE on auth';
  end if;
end;
$assertions$;
