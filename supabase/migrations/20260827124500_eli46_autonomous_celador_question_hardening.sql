-- ELI-46 · Autonomous governed Celador question hardening executor.
--
-- Reuses the ELI-44 package validator / stale guard / atomic update engine.
-- This migration adds only a private trusted-Postgres entry point and the
-- narrow trigger context required for those already-governed Celador updates.
-- No academic content is embedded here and installing this migration performs
-- zero academic writes.

create schema if not exists catalog_maintenance_private authorization postgres;
revoke all on schema catalog_maintenance_private from public, anon, authenticated, service_role;

create table if not exists catalog_maintenance_private.celador_hardening_audit (
  audit_id bigint generated always as identity primary key,
  executed_at timestamptz not null default now(),
  package_id text not null,
  governance_ref text not null,
  opposition_id uuid not null,
  topic_id uuid not null,
  package_fingerprint text not null,
  row_count integer not null check (row_count > 0 and row_count <= 500),
  executor_role text not null
);
revoke all on table catalog_maintenance_private.celador_hardening_audit
  from public, anon, authenticated, service_role;

-- Extend the existing ELI-44 executor with one internal Postgres caller branch.
-- The entire academic/package contract remains in ELI-44; authenticated callers
-- continue to use the original auth.uid()/opposition_admin path unchanged.
do $patch_eli44$
declare
  v_sql text;
  v_old text := $old$
  if current_user <> 'authenticated' then
    raise exception 'ELI-44 requires the authenticated database role' using errcode = '42501';
  end if;
  if v_user_id is null then
    raise exception 'ELI-44 requires a real authenticated user session' using errcode = '42501';
  end if;
  if v_requested_opposition_id is distinct from v_celador_opposition_id then
    raise exception 'ELI-44 is restricted to Celador SMS' using errcode = '42501';
  end if;
  if v_active_opposition_id is distinct from v_celador_opposition_id then
    raise exception 'ELI-44 requires Celador as the active opposition' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.opposition_admins administrator
    where administrator.user_id = v_user_id
      and administrator.opposition_id = v_celador_opposition_id
  ) then
    raise exception 'ELI-44 requires opposition_admin for Celador' using errcode = '42501';
  end if;
$old$;
  v_new text := $new$
  if current_user = 'postgres'
     and current_setting('opoapp.cel_hardening.internal', true) = 'governance' then
    -- Trusted maintenance runtime. Scope/package integrity are still validated
    -- below by the unchanged ELI-44 hardening contract.
    null;
  else
    if current_user <> 'authenticated' then
      raise exception 'ELI-44 requires the authenticated database role' using errcode = '42501';
    end if;
    if v_user_id is null then
      raise exception 'ELI-44 requires a real authenticated user session' using errcode = '42501';
    end if;
    if v_active_opposition_id is distinct from v_celador_opposition_id then
      raise exception 'ELI-44 requires Celador as the active opposition' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.opposition_admins administrator
      where administrator.user_id = v_user_id
        and administrator.opposition_id = v_celador_opposition_id
    ) then
      raise exception 'ELI-44 requires opposition_admin for Celador' using errcode = '42501';
    end if;
  end if;
  if v_requested_opposition_id is distinct from v_celador_opposition_id then
    raise exception 'ELI-44 is restricted to Celador SMS' using errcode = '42501';
  end if;
$new$;
begin
  select pg_get_functiondef(p.oid)
    into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'execute_celador_question_hardening'
    and pg_get_function_identity_arguments(p.oid) = 'p_package jsonb';

  if v_sql is null then
    raise exception 'ELI-46 requires the deployed ELI-44 Celador hardening executor';
  end if;
  if strpos(v_sql, v_old) = 0 then
    raise exception 'ELI-46 could not locate the locked ELI-44 authentication block';
  end if;

  v_sql := replace(v_sql, v_old, v_new);
  execute v_sql;
end
$patch_eli44$;

-- Allow only the same 9-field question UPDATE when the trusted Postgres wrapper
-- sets an exact Celador opposition/topic maintenance context. Existing Auxiliar,
-- Factory and authenticated trigger branches are preserved byte-for-byte by
-- inserting this branch before them.
do $patch_trigger$
declare
  v_sql text;
  v_marker text := $marker$begin
  if current_user='postgres' and current_setting('opoapp.aux_hardening.operation',true) in ('question_hardening','eli42_scope_cleanup') then$marker$;
  v_replacement text := $replacement$begin
  if current_user='postgres' and current_setting('opoapp.cel_hardening.operation',true)='question_hardening' then
    v_opposition_id:=nullif(current_setting('opoapp.cel_hardening.opposition_id',true),'')::uuid;
    v_topic_id:=nullif(current_setting('opoapp.cel_hardening.topic_id',true),'')::uuid;
    v_operation:=current_setting('opoapp.cel_hardening.operation',true);
    if v_opposition_id is null or v_topic_id is null or v_operation is null then
      raise exception 'Incomplete Celador hardening context' using errcode='42501';
    end if;
    if v_opposition_id is distinct from '00000000-0000-4000-8000-000000000002'::uuid then
      raise exception 'Celador hardening executor is restricted to Celador SMS' using errcode='42501';
    end if;
    if tg_table_name <> 'questions' or tg_op <> 'UPDATE' or v_operation <> 'question_hardening' then
      raise exception 'Celador hardening operation denied on %/%',tg_table_name,tg_op using errcode='42501';
    end if;
    if old.opposition_id is distinct from v_opposition_id or old.topic_id is distinct from v_topic_id then
      raise exception 'Celador hardening row is outside the locked topic' using errcode='42501';
    end if;
    if new.id is distinct from old.id
       or new.codigo is distinct from old.codigo
       or new.opposition_id is distinct from old.opposition_id
       or new.subject_id is distinct from old.subject_id
       or new.topic_id is distinct from old.topic_id
       or new.subtopic_id is distinct from old.subtopic_id
       or new.user_id is distinct from old.user_id
       or new.activa is distinct from old.activa then
      raise exception 'Celador hardening cannot change question identity/scope' using errcode='42501';
    end if;
    return new;
  end if;

  if current_user='postgres' and current_setting('opoapp.aux_hardening.operation',true) in ('question_hardening','eli42_scope_cleanup') then$replacement$;
begin
  select pg_get_functiondef(p.oid)
    into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'assign_catalog_opposition'
    and pg_get_function_identity_arguments(p.oid) = '';

  if v_sql is null then
    raise exception 'ELI-46 requires public.assign_catalog_opposition()';
  end if;
  if strpos(v_sql, v_marker) = 0 then
    raise exception 'ELI-46 could not locate the current governed trigger entry point';
  end if;

  v_sql := replace(v_sql, v_marker, v_replacement);
  execute v_sql;
end
$patch_trigger$;

create or replace function catalog_maintenance_private.execute_celador_question_hardening(p_package jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, catalog_maintenance_private, pg_temp
as $function$
declare
  v_celador_opposition_id constant uuid := '00000000-0000-4000-8000-000000000002'::uuid;
  v_package_id text;
  v_mode text;
  v_opposition_id uuid;
  v_topic_id uuid;
  v_package_fingerprint text;
  v_mutation_count integer;
  v_keep_count integer;
  v_result jsonb;
begin
  if current_user <> 'postgres' then
    raise exception 'ELI-46 internal Celador hardening executor is restricted to the trusted Postgres maintenance runtime'
      using errcode='42501';
  end if;
  if p_package is null or jsonb_typeof(p_package) <> 'object' then
    raise exception 'ELI-46 package must be a JSON object' using errcode='22023';
  end if;

  v_package_id := nullif(p_package->>'package_id','');
  v_mode := nullif(p_package->>'mode','');
  v_package_fingerprint := lower(nullif(p_package->>'package_fingerprint',''));
  begin
    v_opposition_id := nullif(p_package->>'opposition_id','')::uuid;
    v_topic_id := nullif(p_package->>'topic_id','')::uuid;
  exception when invalid_text_representation then
    raise exception 'ELI-46 package contains an invalid UUID' using errcode='22023';
  end;

  if v_package_id is distinct from 'eli44_celador_question_hardening_v1' then
    raise exception 'ELI-46 package_id is not allowlisted' using errcode='22023';
  end if;
  if v_mode is null or v_mode not in ('preflight','execute') then
    raise exception 'ELI-46 mode must be preflight or execute' using errcode='22023';
  end if;
  if v_opposition_id is distinct from v_celador_opposition_id then
    raise exception 'ELI-46 is restricted to Celador SMS' using errcode='42501';
  end if;
  if v_topic_id is null or not exists(
    select 1 from public.topics t
    where t.id=v_topic_id and t.opposition_id=v_celador_opposition_id
  ) then
    raise exception 'ELI-46 topic is outside Celador' using errcode='42501';
  end if;
  if v_package_fingerprint is null or v_package_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'ELI-46 requires the ELI-44 lowercase SHA-256 package fingerprint' using errcode='22023';
  end if;
  if jsonb_typeof(p_package->'mutations') <> 'array'
     or jsonb_typeof(p_package->'keeps') <> 'array' then
    raise exception 'ELI-46 requires ELI-44 mutations and keeps arrays' using errcode='22023';
  end if;
  v_mutation_count := jsonb_array_length(p_package->'mutations');
  v_keep_count := jsonb_array_length(p_package->'keeps');
  if v_mutation_count < 1 or v_mutation_count > 500
     or v_keep_count < 0 or v_mutation_count + v_keep_count > 500 then
    raise exception 'ELI-46 package row count must be between 1 and 500 total rows' using errcode='22023';
  end if;

  perform set_config('opoapp.cel_hardening.internal','governance',true);
  perform set_config('opoapp.cel_hardening.opposition_id',v_celador_opposition_id::text,true);
  perform set_config('opoapp.cel_hardening.topic_id',v_topic_id::text,true);
  perform set_config('opoapp.cel_hardening.operation','question_hardening',true);

  v_result := public.execute_celador_question_hardening(p_package);

  if v_mode='execute' then
    insert into catalog_maintenance_private.celador_hardening_audit(
      package_id,governance_ref,opposition_id,topic_id,package_fingerprint,row_count,executor_role
    ) values (
      v_package_id,'ELI-46',v_celador_opposition_id,v_topic_id,v_package_fingerprint,
      coalesce((v_result->>'mutated_questions')::integer,v_mutation_count),current_user
    );
  end if;

  return v_result || jsonb_build_object(
    'governance_executor','ELI-46',
    'executor_role',current_user
  );
end;
$function$;

revoke all on function catalog_maintenance_private.execute_celador_question_hardening(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function catalog_maintenance_private.execute_celador_question_hardening(jsonb) to postgres;

comment on function catalog_maintenance_private.execute_celador_question_hardening(jsonb) is
'ELI-46 private Postgres-maintenance entry point for governed Celador ELI-44 hardening packages. Reuses the ELI-44 package/stale/atomic contract; no generic SQL surface.';
