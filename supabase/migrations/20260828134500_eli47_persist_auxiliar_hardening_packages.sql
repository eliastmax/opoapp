-- ELI-47 · Durable sealing for governed Auxiliar hardening packages.
--
-- ELI-45 preflight remains read-only with respect to academic catalog data.
-- This migration adds a separate private seal step that stores the exact validated
-- JSONB package as governance metadata, plus a one-shot execute-stored entry point.
-- No academic content is changed by installing this migration.

create schema if not exists catalog_maintenance_private authorization postgres;
revoke all on schema catalog_maintenance_private from public, anon, authenticated, service_role;

create table if not exists catalog_maintenance_private.auxiliar_hardening_packages (
  preflight_fingerprint text primary key
    check (preflight_fingerprint ~ '^[0-9a-f]{32}$'),
  package_id text not null,
  governance_ref text not null,
  opposition_id uuid not null,
  topic_id uuid not null,
  row_count integer not null check (row_count between 1 and 500),
  sealed_package jsonb not null,
  sealed_at timestamptz not null default now(),
  sealed_by_role text not null,
  executed_at timestamptz,
  execution_fingerprint text
    check (execution_fingerprint is null or execution_fingerprint ~ '^[0-9a-f]{32}$')
);

revoke all on table catalog_maintenance_private.auxiliar_hardening_packages
  from public, anon, authenticated, service_role;

grant select, insert, update on table catalog_maintenance_private.auxiliar_hardening_packages to postgres;

create or replace function catalog_maintenance_private.seal_auxiliar_question_hardening(
  p_package jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, catalog_maintenance_private, pg_temp
as $function$
declare
  v_result jsonb;
  v_fingerprint text;
  v_existing jsonb;
  v_row_count integer;
  v_opposition_id uuid;
  v_topic_id uuid;
begin
  if current_user <> 'postgres' then
    raise exception 'ELI-47 seal is restricted to the trusted Postgres maintenance runtime'
      using errcode='42501';
  end if;

  if p_package is null or jsonb_typeof(p_package) <> 'object' then
    raise exception 'ELI-47 package must be a JSON object' using errcode='22023';
  end if;

  if p_package->>'mode' is distinct from 'preflight' then
    raise exception 'ELI-47 seal requires an ELI-45 preflight package' using errcode='22023';
  end if;

  -- Re-run the complete ELI-45 validator/stale guard immediately before sealing.
  v_result := catalog_maintenance_private.execute_auxiliar_question_hardening(p_package);
  if v_result->>'result' is distinct from 'PASS'
     or v_result->>'mode' is distinct from 'preflight'
     or coalesce((v_result->>'academic_writes')::integer, -1) <> 0 then
    raise exception 'ELI-47 cannot seal a package that did not pass ELI-45 preflight'
      using errcode='P0001';
  end if;

  v_fingerprint := lower(p_package->>'package_fingerprint');
  v_row_count := jsonb_array_length(p_package->'changes');
  v_opposition_id := (p_package->>'opposition_id')::uuid;
  v_topic_id := (p_package->>'topic_id')::uuid;

  select sealed_package
    into v_existing
  from catalog_maintenance_private.auxiliar_hardening_packages
  where preflight_fingerprint = v_fingerprint;

  if found then
    if v_existing is distinct from p_package then
      raise exception 'ELI-47 fingerprint already sealed with a different payload'
        using errcode='P0001';
    end if;
  else
    insert into catalog_maintenance_private.auxiliar_hardening_packages(
      preflight_fingerprint,
      package_id,
      governance_ref,
      opposition_id,
      topic_id,
      row_count,
      sealed_package,
      sealed_by_role
    ) values (
      v_fingerprint,
      p_package->>'package_id',
      p_package->>'governance_ref',
      v_opposition_id,
      v_topic_id,
      v_row_count,
      p_package,
      current_user
    );
  end if;

  return v_result || jsonb_build_object(
    'sealed', true,
    'sealed_preflight_fingerprint', v_fingerprint,
    'sealed_row_count', v_row_count,
    'seal_writes', 1,
    'academic_writes', 0
  );
end;
$function$;

create or replace function catalog_maintenance_private.execute_stored_auxiliar_question_hardening(
  p_preflight_fingerprint text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, catalog_maintenance_private, pg_temp
as $function$
declare
  v_row catalog_maintenance_private.auxiliar_hardening_packages%rowtype;
  v_execute_package jsonb;
  v_execute_fingerprint text;
  v_result jsonb;
begin
  if current_user <> 'postgres' then
    raise exception 'ELI-47 stored execute is restricted to the trusted Postgres maintenance runtime'
      using errcode='42501';
  end if;

  if p_preflight_fingerprint is null
     or p_preflight_fingerprint !~ '^[0-9a-f]{32}$' then
    raise exception 'ELI-47 requires a lowercase MD5 preflight fingerprint'
      using errcode='22023';
  end if;

  select *
    into v_row
  from catalog_maintenance_private.auxiliar_hardening_packages
  where preflight_fingerprint = p_preflight_fingerprint
  for update;

  if not found then
    raise exception 'ELI-47 sealed package not found: %', p_preflight_fingerprint
      using errcode='P0001';
  end if;

  if v_row.executed_at is not null then
    raise exception 'ELI-47 sealed package already executed: %', p_preflight_fingerprint
      using errcode='P0001';
  end if;

  if v_row.sealed_package->>'mode' is distinct from 'preflight' then
    raise exception 'ELI-47 stored payload is not a preflight package'
      using errcode='P0001';
  end if;

  -- Preserve the exact sealed candidate. Only the transport mode and its integrity
  -- fingerprint change. `changes` and every row fingerprint remain byte-for-byte
  -- equivalent at JSONB value level to the sealed candidate.
  v_execute_package := v_row.sealed_package || jsonb_build_object('mode','execute');
  v_execute_fingerprint := md5((v_execute_package - 'package_fingerprint')::text);
  v_execute_package := v_execute_package || jsonb_build_object(
    'package_fingerprint', v_execute_fingerprint
  );

  v_result := catalog_maintenance_private.execute_auxiliar_question_hardening(v_execute_package);

  if v_result->>'result' is distinct from 'PASS'
     or v_result->>'mode' is distinct from 'execute'
     or coalesce((v_result->>'academic_writes')::integer, -1) <> v_row.row_count then
    raise exception 'ELI-47 stored execution postcondition failed; transaction rolled back'
      using errcode='P0001';
  end if;

  update catalog_maintenance_private.auxiliar_hardening_packages
  set executed_at = now(),
      execution_fingerprint = v_execute_fingerprint
  where preflight_fingerprint = p_preflight_fingerprint;

  return v_result || jsonb_build_object(
    'sealed_preflight_fingerprint', p_preflight_fingerprint,
    'execution_fingerprint', v_execute_fingerprint,
    'stored_payload', true,
    'one_shot', true
  );
end;
$function$;

revoke all on function catalog_maintenance_private.seal_auxiliar_question_hardening(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function catalog_maintenance_private.execute_stored_auxiliar_question_hardening(text)
  from public, anon, authenticated, service_role;

grant execute on function catalog_maintenance_private.seal_auxiliar_question_hardening(jsonb) to postgres;
grant execute on function catalog_maintenance_private.execute_stored_auxiliar_question_hardening(text) to postgres;

comment on table catalog_maintenance_private.auxiliar_hardening_packages is
'ELI-47 private durable store for exact ELI-45 packages after a successful preflight. Not learner/app data.';

comment on function catalog_maintenance_private.seal_auxiliar_question_hardening(jsonb) is
'ELI-47: revalidates ELI-45 preflight and durably seals the exact package as private governance metadata.';

comment on function catalog_maintenance_private.execute_stored_auxiliar_question_hardening(text) is
'ELI-47: one-shot execution of the exact sealed ELI-45 candidate identified by its preflight fingerprint.';
