-- ELI-32 · resolve authenticated actor without granting the technical role USAGE on auth.
-- The explicit REVOKE makes a clean replay independent from the earlier debug grant.
revoke usage on schema auth from v4_authenticated_executor;

grant v4_authenticated_executor to postgres with set true, inherit false;
grant create on schema catalog_import_private to v4_authenticated_executor;
grant create on schema public to v4_authenticated_executor;

set local role v4_authenticated_executor;

create or replace function catalog_import_private.session_auth_uid()
returns uuid
language sql
stable
security invoker
set search_path = pg_catalog, pg_temp
as $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$;

revoke all on function catalog_import_private.session_auth_uid() from public, anon, authenticated, service_role, postgres, factory_catalog_executor;

create or replace function public.import_v4_study_content(p_package jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_user_id uuid := catalog_import_private.session_auth_uid();
  v_opposition_code text;
  v_opposition_id uuid;
  v_topic_number integer;
  v_subject_name text;
  v_topic_matches integer;
  v_topic_id uuid;
  v_active_opposition_id uuid;
begin
  if current_user <> 'v4_authenticated_executor' then
    raise exception 'Unexpected V4 executor' using errcode = '42501';
  end if;
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_package is null or jsonb_typeof(p_package) <> 'object' then
    raise exception 'V4 content package must be a JSON object' using errcode = '22023';
  end if;
  if p_package->>'version' is distinct from '4.0' then
    raise exception 'Unsupported V4 content contract version: %', coalesce(p_package->>'version','<null>') using errcode = '22023';
  end if;
  if jsonb_typeof(p_package->'units') is distinct from 'array'
     or jsonb_typeof(p_package->'concepts') is distinct from 'array'
     or jsonb_typeof(p_package->'questionMappings') is distinct from 'array'
     or jsonb_typeof(p_package->'flashcards') is distinct from 'array' then
    raise exception 'units, concepts, questionMappings and flashcards must be arrays' using errcode = '22023';
  end if;
  v_opposition_code := nullif(btrim(p_package->>'oppositionCode'),'');
  if v_opposition_code is null then
    raise exception 'oppositionCode is required' using errcode = '22023';
  end if;
  perform set_config('opoapp.catalog.actor_user_id', v_user_id::text, true);
  perform set_config('opoapp.catalog.operation', 'v4_import', true);
  select o.id into v_opposition_id from public.oppositions o where o.code = v_opposition_code and o.published is true;
  if v_opposition_id is null then
    raise exception 'Published opposition not found for code %', v_opposition_code using errcode = '22023';
  end if;
  perform set_config('opoapp.catalog.opposition_id', v_opposition_id::text, true);
  -- Historical first helper version. The following migration removes this remaining nominal auth dependency.
  v_active_opposition_id := public.current_active_opposition_id();
  if v_active_opposition_id is distinct from v_opposition_id then
    raise exception 'The package opposition must be the current active opposition' using errcode = '42501';
  end if;
  if not exists (select 1 from public.opposition_admins a where a.user_id = v_user_id and a.opposition_id = v_opposition_id) then
    raise exception 'Opposition administrator permission required' using errcode = '42501';
  end if;
  begin
    v_topic_number := (p_package->>'topicNumber')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'topicNumber must be a positive integer' using errcode = '22023';
  end;
  if v_topic_number is null or v_topic_number < 1 then
    raise exception 'topicNumber must be a positive integer' using errcode = '22023';
  end if;
  v_subject_name := nullif(btrim(p_package->>'subjectName'),'');
  if v_subject_name is not null then
    select count(*)::integer, case when count(*) = 1 then (array_agg(t.id order by t.id))[1] end
    into v_topic_matches, v_topic_id
    from public.topics t
    join public.subjects s on s.id = t.subject_id and s.opposition_id = t.opposition_id
    where t.opposition_id = v_opposition_id and t.numero = v_topic_number and s.nombre = v_subject_name;
    if v_topic_matches = 0 then
      raise exception 'Topic % under subject % not found in opposition %', v_topic_number, v_subject_name, v_opposition_code using errcode = '22023';
    elsif v_topic_matches > 1 then
      raise exception 'Topic % under subject % is not unique in opposition %', v_topic_number, v_subject_name, v_opposition_code using errcode = '22023';
    end if;
  else
    select count(*)::integer, case when count(*) = 1 then (array_agg(t.id order by t.id))[1] end
    into v_topic_matches, v_topic_id
    from public.topics t where t.opposition_id = v_opposition_id and t.numero = v_topic_number;
    if v_topic_matches = 0 then
      raise exception 'Topic % not found in opposition %', v_topic_number, v_opposition_code using errcode = '22023';
    elsif v_topic_matches > 1 then
      raise exception 'Topic % is ambiguous in opposition %; subjectName is required', v_topic_number, v_opposition_code using errcode = '22023';
    end if;
  end if;
  perform set_config('opoapp.catalog.topic_id', v_topic_id::text, true);
  return catalog_import_private.import_v4_core(v_user_id, v_opposition_id, v_topic_id, p_package);
end;
$function$;

reset role;
revoke create on schema catalog_import_private from v4_authenticated_executor;
revoke create on schema public from v4_authenticated_executor;
revoke v4_authenticated_executor from postgres;

do $assertions$
begin
  if has_schema_privilege('v4_authenticated_executor', 'auth', 'USAGE') then
    raise exception 'ELI-32 must not grant auth schema usage to v4_authenticated_executor';
  end if;
  if has_function_privilege('authenticated', 'catalog_import_private.session_auth_uid()', 'EXECUTE')
     or has_function_privilege('anon', 'catalog_import_private.session_auth_uid()', 'EXECUTE')
     or has_function_privilege('service_role', 'catalog_import_private.session_auth_uid()', 'EXECUTE')
     or has_function_privilege('factory_catalog_executor', 'catalog_import_private.session_auth_uid()', 'EXECUTE') then
    raise exception 'ELI-32 session auth helper leaked outside v4 executor';
  end if;
  if pg_has_role('postgres','v4_authenticated_executor','SET') or pg_has_role('postgres','v4_authenticated_executor','USAGE') then
    raise exception 'postgres must not gain v4 executor role privileges';
  end if;
end;
$assertions$;
