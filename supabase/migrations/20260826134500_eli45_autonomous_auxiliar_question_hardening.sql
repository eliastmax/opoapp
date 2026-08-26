-- ELI-45 · Autonomous governed Auxiliar question hardening executor.
--
-- This internal maintenance path removes the need for a human Supabase Auth
-- login on every Auxiliar topic while leaving learner/app RLS unchanged.
-- It is callable only from the trusted Postgres maintenance runtime, is locked
-- to Auxiliar, updates existing questions in place only, and requires package
-- integrity + row-level stale fingerprints before any write.

create schema if not exists catalog_maintenance_private authorization postgres;
revoke all on schema catalog_maintenance_private from public, anon, authenticated, service_role;

create table if not exists catalog_maintenance_private.auxiliar_hardening_audit (
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
revoke all on table catalog_maintenance_private.auxiliar_hardening_audit from public, anon, authenticated, service_role;

create or replace function catalog_maintenance_private.auxiliar_question_fingerprint(p_question_id uuid)
returns text
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $function$
  select md5(
    jsonb_build_array(
      q.id::text,
      q.codigo,
      q.opposition_id::text,
      q.topic_id::text,
      coalesce(q.subtopic_id::text, ''),
      q.pregunta,
      q.opcion_a,
      q.opcion_b,
      q.opcion_c,
      q.opcion_d,
      q.respuesta_correcta::text,
      q.explicacion,
      coalesce(q.nivel_pedagogico, ''),
      coalesce(q.tipo_trampa, ''),
      q.activa
    )::text
  )
  from public.questions q
  where q.id = p_question_id;
$function$;
revoke all on function catalog_maintenance_private.auxiliar_question_fingerprint(uuid)
  from public, anon, authenticated, service_role;
grant execute on function catalog_maintenance_private.auxiliar_question_fingerprint(uuid) to postgres;

-- Preserve existing authenticated/Celador behavior, adding only one internal
-- Postgres branch that is active when the private executor sets the exact GUCs.
create or replace function public.assign_catalog_opposition()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'pg_temp'
as $function$
declare
  v_user_id uuid; v_opposition_id uuid; v_topic_id uuid; v_operation text;
  v_actor_user_id uuid; v_locked_subject_id uuid; v_locked_curator_id uuid;
begin
  if current_user='postgres' and current_setting('opoapp.aux_hardening.operation',true)='question_hardening' then
    v_opposition_id:=nullif(current_setting('opoapp.aux_hardening.opposition_id',true),'')::uuid;
    v_topic_id:=nullif(current_setting('opoapp.aux_hardening.topic_id',true),'')::uuid;
    v_operation:=current_setting('opoapp.aux_hardening.operation',true);
    if v_opposition_id is null or v_topic_id is null or v_operation is null then
      raise exception 'Incomplete Auxiliar hardening context' using errcode='42501';
    end if;
    if v_opposition_id is distinct from '00000000-0000-4000-8000-000000000001'::uuid then
      raise exception 'Auxiliar hardening executor is restricted to Auxiliar SMS' using errcode='42501';
    end if;
    if tg_table_name <> 'questions' or tg_op <> 'UPDATE' or v_operation <> 'question_hardening' then
      raise exception 'Auxiliar hardening operation denied on %/%',tg_table_name,tg_op using errcode='42501';
    end if;
    if old.opposition_id is distinct from v_opposition_id or old.topic_id is distinct from v_topic_id then
      raise exception 'Auxiliar hardening row is outside the locked topic' using errcode='42501';
    end if;
    if new.id is distinct from old.id
       or new.codigo is distinct from old.codigo
       or new.opposition_id is distinct from old.opposition_id
       or new.subject_id is distinct from old.subject_id
       or new.topic_id is distinct from old.topic_id
       or new.subtopic_id is distinct from old.subtopic_id
       or new.user_id is distinct from old.user_id
       or new.activa is distinct from old.activa then
      raise exception 'Auxiliar hardening cannot change question identity/scope' using errcode='42501';
    end if;
    return new;
  end if;

  if current_user='factory_catalog_executor' then
    v_actor_user_id:=nullif(current_setting('opoapp.catalog.actor_user_id',true),'')::uuid;
    v_opposition_id:=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid;
    v_topic_id:=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid;
    v_operation:=current_setting('opoapp.catalog.operation',true);
    if v_actor_user_id is null or v_opposition_id is null or v_topic_id is null
       or nullif(current_setting('opoapp.catalog.run_id',true),'') is null or v_operation is null then
      raise exception 'Incomplete Factory catalog context' using errcode='42501';
    end if;
    if v_opposition_id is distinct from '00000000-0000-4000-8000-000000000002'::uuid then
      raise exception 'Factory v1 is restricted to Celador SMS' using errcode='42501';
    end if;
    if not exists(select 1 from public.opposition_admins a where a.user_id=v_actor_user_id and a.opposition_id=v_opposition_id) then
      raise exception 'Factory actor is not an opposition administrator' using errcode='42501';
    end if;
    select t.subject_id,t.user_id into v_locked_subject_id,v_locked_curator_id
    from public.topics t where t.id=v_topic_id and t.opposition_id=v_opposition_id;
    if v_locked_subject_id is null or v_locked_curator_id is null then
      raise exception 'Factory topic is outside the locked opposition' using errcode='42501';
    end if;
    if tg_table_name in ('subjects','topics') then
      raise exception 'Factory cannot write %',tg_table_name using errcode='42501';
    elsif tg_table_name='subtopics' then
      if tg_op<>'INSERT' or v_operation<>'questions_import' then
        raise exception 'Factory subtopic operation denied' using errcode='42501';
      end if;
      if new.topic_id is distinct from v_topic_id or new.opposition_id is distinct from v_opposition_id
         or new.user_id is distinct from v_locked_curator_id then
        raise exception 'Factory subtopic scope mismatch' using errcode='42501';
      end if;
      return new;
    elsif tg_table_name='questions' then
      if v_operation<>'questions_import' or tg_op not in ('INSERT','UPDATE') then
        raise exception 'Factory question operation denied' using errcode='42501';
      end if;
      if tg_op='INSERT' then
        if new.opposition_id is distinct from v_opposition_id or new.topic_id is distinct from v_topic_id
           or new.subject_id is distinct from v_locked_subject_id or new.user_id is distinct from v_locked_curator_id then
          raise exception 'Factory question scope mismatch' using errcode='42501';
        end if;
      else
        if old.opposition_id is distinct from v_opposition_id or old.topic_id is distinct from v_topic_id
           or new.opposition_id is distinct from old.opposition_id or new.topic_id is distinct from old.topic_id
           or new.subject_id is distinct from old.subject_id or new.user_id is distinct from old.user_id then
          raise exception 'Factory question identity cannot move' using errcode='42501';
        end if;
      end if;
      if new.subtopic_id is not null and not exists(
        select 1 from public.subtopics s
        where s.id=new.subtopic_id and s.opposition_id=v_opposition_id and s.topic_id=v_topic_id and s.user_id=v_locked_curator_id
      ) then raise exception 'Factory question subtopic is outside the locked topic' using errcode='42501'; end if;
      return new;
    end if;
    raise exception 'Factory trigger table not authorized: %',tg_table_name using errcode='42501';
  end if;

  v_user_id:=(select auth.uid());
  v_opposition_id:=public.current_active_opposition_id();
  if v_user_id is null or v_opposition_id is null then
    raise exception 'An active opposition is required' using errcode='42501';
  end if;
  if not exists(
    select 1 from public.opposition_admins administrator
    where administrator.user_id=v_user_id and administrator.opposition_id=v_opposition_id
  ) then
    raise exception 'Only catalog administrators can change catalog content' using errcode='42501';
  end if;
  if tg_op='UPDATE' then
    if new.opposition_id is distinct from old.opposition_id then raise exception 'Catalog rows cannot be moved between oppositions'; end if;
    if new.user_id is distinct from old.user_id then raise exception 'The legacy catalog curator cannot be changed'; end if;
  end if;
  new.opposition_id:=v_opposition_id;
  return new;
end;
$function$;

create or replace function catalog_maintenance_private.execute_auxiliar_question_hardening(p_package jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, catalog_maintenance_private, pg_temp
as $function$
declare
  v_auxiliar_opposition_id constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  v_package_id text; v_governance_ref text; v_mode text; v_opposition_id uuid; v_topic_id uuid;
  v_package_fingerprint text; v_computed_package_fingerprint text; v_changes jsonb; v_change jsonb;
  v_change_count integer; v_unknown_keys text[]; v_question public.questions%rowtype; v_question_id uuid;
  v_codigo text; v_expected_fingerprint text; v_current_fingerprint text; v_answer text; v_level text; v_trap text; v_affected integer;
begin
  if current_user <> 'postgres' then
    raise exception 'ELI-45 internal hardening executor is restricted to the trusted Postgres maintenance runtime' using errcode='42501';
  end if;
  if p_package is null or jsonb_typeof(p_package) <> 'object' then raise exception 'ELI-45 package must be a JSON object' using errcode='22023'; end if;
  select array_agg(key order by key) into v_unknown_keys from jsonb_object_keys(p_package) as keys(key)
  where key not in ('package_id','governance_ref','mode','opposition_id','topic_id','package_fingerprint','changes');
  if coalesce(cardinality(v_unknown_keys),0)>0 then raise exception 'ELI-45 package contains unsupported keys: %',array_to_string(v_unknown_keys,', ') using errcode='22023'; end if;
  v_package_id:=nullif(p_package->>'package_id',''); v_governance_ref:=nullif(p_package->>'governance_ref',''); v_mode:=nullif(p_package->>'mode','');
  v_package_fingerprint:=lower(nullif(p_package->>'package_fingerprint','')); v_changes:=p_package->'changes';
  begin v_opposition_id:=nullif(p_package->>'opposition_id','')::uuid; v_topic_id:=nullif(p_package->>'topic_id','')::uuid;
  exception when invalid_text_representation then raise exception 'ELI-45 package contains an invalid UUID' using errcode='22023'; end;
  if v_package_id is distinct from 'auxiliar_question_hardening_v1' then raise exception 'ELI-45 package_id is not allowlisted' using errcode='22023'; end if;
  if v_governance_ref is null or v_governance_ref !~ '^ELI-[0-9]+$' then raise exception 'ELI-45 requires a Linear governance_ref such as ELI-41' using errcode='22023'; end if;
  if v_mode is null or v_mode not in ('preflight','execute') then raise exception 'ELI-45 mode must be preflight or execute' using errcode='22023'; end if;
  if v_opposition_id is distinct from v_auxiliar_opposition_id then raise exception 'ELI-45 is restricted to Auxiliar Administrativo SMS' using errcode='42501'; end if;
  if v_topic_id is null or not exists(select 1 from public.topics t where t.id=v_topic_id and t.opposition_id=v_auxiliar_opposition_id) then raise exception 'ELI-45 topic is outside Auxiliar' using errcode='42501'; end if;
  if v_package_fingerprint is null or v_package_fingerprint !~ '^[0-9a-f]{32}$' then raise exception 'ELI-45 package_fingerprint must be lowercase MD5 hex' using errcode='22023'; end if;
  v_computed_package_fingerprint:=md5((p_package-'package_fingerprint')::text);
  if v_package_fingerprint is distinct from v_computed_package_fingerprint then raise exception 'ELI-45 package fingerprint mismatch' using errcode='P0001'; end if;
  if v_changes is null or jsonb_typeof(v_changes)<>'array' then raise exception 'ELI-45 changes must be an array' using errcode='22023'; end if;
  v_change_count:=jsonb_array_length(v_changes); if v_change_count<1 or v_change_count>500 then raise exception 'ELI-45 package row count must be between 1 and 500' using errcode='22023'; end if;
  if exists(select 1 from (select change->>'id',count(*) from jsonb_array_elements(v_changes) change group by change->>'id' having count(*)>1) d) then raise exception 'ELI-45 package contains duplicate question ids' using errcode='22023'; end if;
  if exists(select 1 from (select change->>'codigo',count(*) from jsonb_array_elements(v_changes) change group by change->>'codigo' having count(*)>1) d) then raise exception 'ELI-45 package contains duplicate question codes' using errcode='22023'; end if;
  if v_mode='execute' then
    perform set_config('opoapp.aux_hardening.opposition_id',v_auxiliar_opposition_id::text,true);
    perform set_config('opoapp.aux_hardening.topic_id',v_topic_id::text,true);
    perform set_config('opoapp.aux_hardening.operation','question_hardening',true);
  end if;
  for v_change in select value from jsonb_array_elements(v_changes) loop
    if jsonb_typeof(v_change)<>'object' then raise exception 'ELI-45 each change must be an object' using errcode='22023'; end if;
    select array_agg(key order by key) into v_unknown_keys from jsonb_object_keys(v_change) as keys(key)
    where key not in ('id','codigo','expected_fingerprint','pregunta','opcion_a','opcion_b','opcion_c','opcion_d','respuesta_correcta','explicacion','nivel_pedagogico','tipo_trampa');
    if coalesce(cardinality(v_unknown_keys),0)>0 then raise exception 'ELI-45 change contains unsupported keys: %',array_to_string(v_unknown_keys,', ') using errcode='22023'; end if;
    begin v_question_id:=nullif(v_change->>'id','')::uuid; exception when invalid_text_representation then raise exception 'ELI-45 change contains invalid question id' using errcode='22023'; end;
    v_codigo:=nullif(v_change->>'codigo',''); v_expected_fingerprint:=lower(nullif(v_change->>'expected_fingerprint','')); v_answer:=upper(nullif(v_change->>'respuesta_correcta','')); v_level:=lower(nullif(v_change->>'nivel_pedagogico','')); v_trap:=nullif(v_change->>'tipo_trampa','');
    if v_question_id is null or v_codigo is null or v_expected_fingerprint is null then raise exception 'ELI-45 change identity/fingerprint fields are required' using errcode='22023'; end if;
    if v_expected_fingerprint !~ '^[0-9a-f]{32}$' then raise exception 'ELI-45 expected_fingerprint must be lowercase MD5 hex for %',v_codigo using errcode='22023'; end if;
    if coalesce(btrim(v_change->>'pregunta'),'')='' or coalesce(btrim(v_change->>'opcion_a'),'')='' or coalesce(btrim(v_change->>'opcion_b'),'')='' or coalesce(btrim(v_change->>'opcion_c'),'')='' or coalesce(btrim(v_change->>'opcion_d'),'')='' or coalesce(btrim(v_change->>'explicacion'),'')='' then raise exception 'ELI-45 hardened text fields cannot be empty for %',v_codigo using errcode='22023'; end if;
    if v_answer not in ('A','B','C','D') then raise exception 'ELI-45 respuesta_correcta must be A/B/C/D for %',v_codigo using errcode='22023'; end if;
    if v_level not in ('aprendizaje','consolidacion','tribunal') then raise exception 'ELI-45 nivel_pedagogico invalid for %',v_codigo using errcode='22023'; end if;
    if v_trap is not null and (length(v_trap)>64 or v_trap !~ '^[a-z0-9_]+$') then raise exception 'ELI-45 tipo_trampa invalid for %',v_codigo using errcode='22023'; end if;
    if v_mode='execute' then select q.* into v_question from public.questions q where q.id=v_question_id for update; else select q.* into v_question from public.questions q where q.id=v_question_id; end if;
    if not found then raise exception 'ELI-45 question id not found: %',v_question_id using errcode='P0001'; end if;
    if not v_question.activa or v_question.opposition_id is distinct from v_auxiliar_opposition_id or v_question.topic_id is distinct from v_topic_id or v_question.codigo is distinct from v_codigo then raise exception 'ELI-45 question identity/scope mismatch for %',v_codigo using errcode='P0001'; end if;
    v_current_fingerprint:=catalog_maintenance_private.auxiliar_question_fingerprint(v_question_id);
    if v_current_fingerprint is distinct from v_expected_fingerprint then raise exception 'ELI-45 stale package detected for %',v_codigo using errcode='P0001'; end if;
    if v_mode='execute' then
      update public.questions q set pregunta=v_change->>'pregunta', opcion_a=v_change->>'opcion_a', opcion_b=v_change->>'opcion_b', opcion_c=v_change->>'opcion_c', opcion_d=v_change->>'opcion_d', respuesta_correcta=v_answer::public.respuesta_enum, explicacion=v_change->>'explicacion', nivel_pedagogico=v_level, tipo_trampa=v_trap
      where q.id=v_question_id and q.codigo=v_codigo and q.opposition_id=v_auxiliar_opposition_id and q.topic_id=v_topic_id and q.activa;
      get diagnostics v_affected=row_count; if v_affected<>1 then raise exception 'ELI-45 update count mismatch for %',v_codigo using errcode='P0001'; end if;
      if not exists(select 1 from public.questions q where q.id=v_question_id and q.codigo=v_codigo and q.opposition_id=v_auxiliar_opposition_id and q.topic_id=v_topic_id and q.activa and q.pregunta is not distinct from v_change->>'pregunta' and q.opcion_a is not distinct from v_change->>'opcion_a' and q.opcion_b is not distinct from v_change->>'opcion_b' and q.opcion_c is not distinct from v_change->>'opcion_c' and q.opcion_d is not distinct from v_change->>'opcion_d' and q.respuesta_correcta::text is not distinct from v_answer and q.explicacion is not distinct from v_change->>'explicacion' and q.nivel_pedagogico is not distinct from v_level and q.tipo_trampa is not distinct from v_trap) then raise exception 'ELI-45 postcondition mismatch for %; transaction rolled back',v_codigo using errcode='P0001'; end if;
    end if;
  end loop;
  if v_mode='preflight' then return jsonb_build_object('result','PASS','mode','preflight','package_id',v_package_id,'governance_ref',v_governance_ref,'opposition_id',v_auxiliar_opposition_id,'topic_id',v_topic_id,'row_count',v_change_count,'package_fingerprint',v_package_fingerprint,'academic_writes',0,'executor','internal_governance'); end if;
  insert into catalog_maintenance_private.auxiliar_hardening_audit(package_id,governance_ref,opposition_id,topic_id,package_fingerprint,row_count,executor_role) values(v_package_id,v_governance_ref,v_auxiliar_opposition_id,v_topic_id,v_package_fingerprint,v_change_count,current_user);
  return jsonb_build_object('result','PASS','mode','execute','package_id',v_package_id,'governance_ref',v_governance_ref,'opposition_id',v_auxiliar_opposition_id,'topic_id',v_topic_id,'row_count',v_change_count,'package_fingerprint',v_package_fingerprint,'academic_writes',v_change_count,'executor','internal_governance');
end;
$function$;

revoke all on function catalog_maintenance_private.execute_auxiliar_question_hardening(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function catalog_maintenance_private.execute_auxiliar_question_hardening(jsonb) to postgres;
