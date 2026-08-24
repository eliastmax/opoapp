-- ELI-44 operational correction.
-- Re-apply the original row-locking executor body after deployment validation and extend
-- its fixed search_path with the Supabase pgcrypto schema. This migration changes no academic rows.

do $restore$
declare
  v_sql text;
begin
  select split_part(statements[1], '$function$;', 1) || '$function$;'
    into v_sql
  from supabase_migrations.schema_migrations
  where version = '20260824223841';

  if v_sql is null then
    raise exception 'ELI-44 original locked executor migration is unavailable';
  end if;

  v_sql := replace(
    v_sql,
    'set search_path = pg_catalog, public, pg_temp',
    'set search_path = pg_catalog, public, extensions, pg_temp'
  );
  execute v_sql;
end
$restore$;

revoke all on function public.execute_celador_question_hardening(jsonb) from public, anon, service_role;
grant execute on function public.execute_celador_question_hardening(jsonb) to authenticated;
