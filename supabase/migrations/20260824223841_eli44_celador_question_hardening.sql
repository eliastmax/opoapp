-- ELI-44 · Authenticated Celador existing-question hardening executor.
-- Infrastructure only. Installing this function does not mutate academic rows.
-- SECURITY INVOKER: all reads/updates remain subject to the authenticated caller's RLS privileges.

create or replace function public.execute_celador_question_hardening(p_package jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_active_opposition_id uuid := public.current_active_opposition_id();
  v_celador_opposition_id constant uuid := '00000000-0000-4000-8000-000000000002'::uuid;
  v_t11_topic_id constant uuid := '1f4a5e28-51c0-47c9-8ef1-1189a62ab152'::uuid;
  v_probe_package_id constant text := 'eli44_celador_hardening_probe_v1';
  v_hardening_package_id constant text := 'eli44_celador_question_hardening_v1';

  v_package_id text;
  v_mode text;
  v_requested_opposition_id uuid;
  v_requested_topic_id uuid;
  v_package_fingerprint text;
  v_computed_package_fingerprint text;
  v_confirmation text;
  v_expected jsonb;
  v_mutations jsonb;
  v_keeps jsonb;
  v_row jsonb;
  v_values jsonb;
  v_unknown_keys text[];
  v_question_id uuid;
  v_codigo text;
  v_decision text;
  v_expected_fp text;
  v_current_fp text;
  v_answer text;
  v_level text;
  v_affected integer;
  v_index integer;
  v_edit_count integer := 0;
  v_replace_count integer := 0;
  v_existing_count integer;
  v_fingerprint_match_count integer;
  v_noop_count integer := 0;

  v_expected_active integer;
  v_expected_mutations integer;
  v_expected_keeps integer;
  v_expected_edits integer;
  v_expected_replaces integer;
  v_expected_aprendizaje integer;
  v_expected_consolidacion integer;
  v_expected_tribunal integer;
  v_expected_a integer;
  v_expected_b integer;
  v_expected_c integer;
  v_expected_d integer;
  v_expected_primary integer;
  v_expected_units integer;
  v_expected_concepts integer;
  v_expected_flashcards integer;

  v_active_count integer;
  v_primary_count integer;
  v_units_count integer;
  v_concepts_count integer;
  v_flashcards_count integer;
  v_projected_aprendizaje integer;
  v_projected_consolidacion integer;
  v_projected_tribunal integer;
  v_projected_a integer;
  v_projected_b integer;
  v_projected_c integer;
  v_projected_d integer;
  v_target_match_count integer;

  v_immutable_before text;
  v_immutable_after text;
  v_qc_before text;
  v_qc_after text;
  v_units_before text;
  v_units_after text;
  v_concepts_before text;
  v_concepts_after text;
  v_flashcards_before text;
  v_flashcards_after text;

  v_q public.questions%rowtype;
begin
  if p_package is null or jsonb_typeof(p_package) <> 'object' then
    raise exception 'ELI-44 package must be a JSON object' using errcode = '22023';
  end if;

  select array_agg(key order by key)
  into v_unknown_keys
  from jsonb_object_keys(p_package) as keys(key)
  where key not in ('package_id','mode','opposition_id','topic_id','package_fingerprint','confirmation','expected','mutations','keeps');
  if coalesce(cardinality(v_unknown_keys), 0) > 0 then
    raise exception 'ELI-44 package contains unsupported keys: %', array_to_string(v_unknown_keys, ', ')
      using errcode = '22023';
  end if;

  v_package_id := nullif(p_package ->> 'package_id', '');
  v_mode := nullif(p_package ->> 'mode', '');
  v_package_fingerprint := nullif(p_package ->> 'package_fingerprint', '');
  v_confirmation := nullif(p_package ->> 'confirmation', '');

  begin
    v_requested_opposition_id := nullif(p_package ->> 'opposition_id', '')::uuid;
    v_requested_topic_id := nullif(p_package ->> 'topic_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'ELI-44 package contains an invalid UUID' using errcode = '22023';
  end;

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

  if v_package_id = v_probe_package_id then
    if v_mode is distinct from 'probe' then
      raise exception 'ELI-44 harmless probe only supports mode=probe' using errcode = '22023';
    end if;
    if v_requested_topic_id is not null or v_package_fingerprint is not null or v_confirmation is not null
       or p_package ? 'expected' or p_package ? 'mutations' or p_package ? 'keeps' then
      raise exception 'ELI-44 harmless probe does not accept hardening payload fields' using errcode = '22023';
    end if;
    select count(*) filter (where q.activa),
           count(*) filter (where q.activa and q.topic_id = v_t11_topic_id)
    into v_active_count, v_existing_count
    from public.questions q
    where q.opposition_id = v_celador_opposition_id;
    return jsonb_build_object(
      'result','PASS', 'package_id',v_package_id, 'mode','probe',
      'authenticated',true, 'celador_admin',true,
      'active_opposition_id',v_celador_opposition_id,
      'celador_active_questions',v_active_count, 't11_active',v_existing_count,
      'academic_writes',0
    );
  end if;

  if v_package_id is distinct from v_hardening_package_id then
    raise exception 'ELI-44 package is not allowlisted' using errcode = '22023';
  end if;
  if v_mode is null or v_mode not in ('preflight','execute') then
    raise exception 'ELI-44 hardening mode must be preflight or execute' using errcode = '22023';
  end if;
  if v_requested_topic_id is null then
    raise exception 'ELI-44 hardening package requires topic_id' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.topics t
    where t.id = v_requested_topic_id and t.opposition_id = v_celador_opposition_id
  ) then
    raise exception 'ELI-44 topic_id is not a Celador topic' using errcode = '42501';
  end if;
  if v_mode = 'preflight' and v_confirmation is not null then
    raise exception 'ELI-44 preflight does not accept confirmation' using errcode = '22023';
  end if;
  if v_package_fingerprint is null or v_package_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'ELI-44 package_fingerprint must be lowercase SHA-256 hex' using errcode = '22023';
  end if;

  v_expected := p_package -> 'expected';
  v_mutations := p_package -> 'mutations';
  v_keeps := p_package -> 'keeps';
  if jsonb_typeof(v_expected) <> 'object' or jsonb_typeof(v_mutations) <> 'array' or jsonb_typeof(v_keeps) <> 'array' then
    raise exception 'ELI-44 expected/mutations/keeps have invalid JSON types' using errcode = '22023';
  end if;

  select array_agg(key order by key)
  into v_unknown_keys
  from jsonb_object_keys(v_expected) as keys(key)
  where key not in ('active_questions','mutation_count','keep_count','edit_count','replace_count','levels','answers','primary_mappings','study_units','concepts','flashcards');
  if coalesce(cardinality(v_unknown_keys), 0) > 0 then
    raise exception 'ELI-44 expected contains unsupported keys: %', array_to_string(v_unknown_keys, ', ')
      using errcode = '22023';
  end if;
  if jsonb_typeof(v_expected -> 'levels') <> 'object' or jsonb_typeof(v_expected -> 'answers') <> 'object' then
    raise exception 'ELI-44 expected.levels and expected.answers must be objects' using errcode = '22023';
  end if;
  if not (v_expected ?& array['active_questions','mutation_count','keep_count','edit_count','replace_count','levels','answers','primary_mappings','study_units','concepts','flashcards']) then
    raise exception 'ELI-44 expected is missing required keys' using errcode = '22023';
  end if;
  if not ((v_expected -> 'levels') ?& array['aprendizaje','consolidacion','tribunal']) then
    raise exception 'ELI-44 expected.levels is missing required keys' using errcode = '22023';
  end if;
  if not ((v_expected -> 'answers') ?& array['A','B','C','D']) then
    raise exception 'ELI-44 expected.answers is missing required keys' using errcode = '22023';
  end if;
  select array_agg(key order by key) into v_unknown_keys
  from jsonb_object_keys(v_expected -> 'levels') as keys(key)
  where key not in ('aprendizaje','consolidacion','tribunal');
  if coalesce(cardinality(v_unknown_keys), 0) > 0 then
    raise exception 'ELI-44 expected.levels contains unsupported keys' using errcode = '22023';
  end if;
  select array_agg(key order by key) into v_unknown_keys
  from jsonb_object_keys(v_expected -> 'answers') as keys(key)
  where key not in ('A','B','C','D');
  if coalesce(cardinality(v_unknown_keys), 0) > 0 then
    raise exception 'ELI-44 expected.answers contains unsupported keys' using errcode = '22023';
  end if;

  begin
    v_expected_active := (v_expected ->> 'active_questions')::integer;
    v_expected_mutations := (v_expected ->> 'mutation_count')::integer;
    v_expected_keeps := (v_expected ->> 'keep_count')::integer;
    v_expected_edits := (v_expected ->> 'edit_count')::integer;
    v_expected_replaces := (v_expected ->> 'replace_count')::integer;
    v_expected_aprendizaje := (v_expected -> 'levels' ->> 'aprendizaje')::integer;
    v_expected_consolidacion := (v_expected -> 'levels' ->> 'consolidacion')::integer;
    v_expected_tribunal := (v_expected -> 'levels' ->> 'tribunal')::integer;
    v_expected_a := (v_expected -> 'answers' ->> 'A')::integer;
    v_expected_b := (v_expected -> 'answers' ->> 'B')::integer;
    v_expected_c := (v_expected -> 'answers' ->> 'C')::integer;
    v_expected_d := (v_expected -> 'answers' ->> 'D')::integer;
    v_expected_primary := (v_expected ->> 'primary_mappings')::integer;
    v_expected_units := (v_expected ->> 'study_units')::integer;
    v_expected_concepts := (v_expected ->> 'concepts')::integer;
    v_expected_flashcards := (v_expected ->> 'flashcards')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'ELI-44 expected counts must be integers' using errcode = '22023';
  end;
  if least(v_expected_active,v_expected_mutations,v_expected_keeps,v_expected_edits,v_expected_replaces,
           v_expected_aprendizaje,v_expected_consolidacion,v_expected_tribunal,
           v_expected_a,v_expected_b,v_expected_c,v_expected_d,
           v_expected_primary,v_expected_units,v_expected_concepts,v_expected_flashcards) < 0 then
    raise exception 'ELI-44 expected counts cannot be negative' using errcode = '22023';
  end if;
  if jsonb_array_length(v_mutations) <> v_expected_mutations or jsonb_array_length(v_keeps) <> v_expected_keeps
     or v_expected_mutations + v_expected_keeps <> v_expected_active then
    raise exception 'ELI-44 package row counts do not match expected counts' using errcode = '22023';
  end if;

  -- Payload identity uniqueness, including KEEP-vs-mutation overlap.
  if exists (
    with rows as (
      select elem ->> 'question_id' id from jsonb_array_elements(v_mutations) elem
      union all
      select elem ->> 'question_id' id from jsonb_array_elements(v_keeps) elem
    ) select 1 from rows group by id having count(*) > 1
  ) then raise exception 'ELI-44 duplicate question_id in package' using errcode = '22023'; end if;
  if exists (
    with rows as (
      select elem ->> 'codigo' code from jsonb_array_elements(v_mutations) elem
      union all
      select elem ->> 'codigo' code from jsonb_array_elements(v_keeps) elem
    ) select 1 from rows group by code having count(*) > 1
  ) then raise exception 'ELI-44 duplicate codigo in package' using errcode = '22023'; end if;

  -- Validate every mutation structurally, resolve only by question_id, then prove codigo/topic/opposition/active match.
  v_index := 0;
  for v_row in select value from jsonb_array_elements(v_mutations)
  loop
    v_index := v_index + 1;
    if jsonb_typeof(v_row) <> 'object' then raise exception 'ELI-44 mutation % is not an object', v_index using errcode = '22023'; end if;
    select array_agg(key order by key) into v_unknown_keys from jsonb_object_keys(v_row) keys(key)
    where key not in ('question_id','codigo','decision','expected_current_fingerprint','new_values');
    if coalesce(cardinality(v_unknown_keys),0) > 0 then
      raise exception 'ELI-44 mutation % contains unsupported keys: %', v_index, array_to_string(v_unknown_keys, ', ') using errcode='22023';
    end if;
    begin v_question_id := nullif(v_row ->> 'question_id','')::uuid;
    exception when invalid_text_representation then raise exception 'ELI-44 mutation % has invalid question_id', v_index using errcode='22023'; end;
    v_codigo := nullif(v_row ->> 'codigo','');
    v_decision := nullif(v_row ->> 'decision','');
    v_expected_fp := nullif(v_row ->> 'expected_current_fingerprint','');
    v_values := v_row -> 'new_values';
    if v_question_id is null or v_codigo is null or v_decision not in ('EDIT','REPLACE')
       or v_expected_fp is null or v_expected_fp !~ '^[0-9a-f]{64}$' or jsonb_typeof(v_values) <> 'object' then
      raise exception 'ELI-44 mutation % is incomplete or invalid', v_index using errcode='22023';
    end if;
    if v_decision='EDIT' then v_edit_count := v_edit_count+1; else v_replace_count := v_replace_count+1; end if;
    select array_agg(key order by key) into v_unknown_keys from jsonb_object_keys(v_values) keys(key)
    where key not in ('pregunta','opcion_a','opcion_b','opcion_c','opcion_d','respuesta_correcta','explicacion','nivel_pedagogico','tipo_trampa');
    if coalesce(cardinality(v_unknown_keys),0) > 0 then
      raise exception 'ELI-44 mutation % new_values contains unsupported keys: %', v_index, array_to_string(v_unknown_keys, ', ') using errcode='22023';
    end if;
    if not (v_values ?& array['pregunta','opcion_a','opcion_b','opcion_c','opcion_d','respuesta_correcta','explicacion','nivel_pedagogico','tipo_trampa']) then
      raise exception 'ELI-44 mutation % new_values is missing allowlisted fields', v_index using errcode='22023';
    end if;
    if nullif(v_values->>'pregunta','') is null or nullif(v_values->>'opcion_a','') is null
       or nullif(v_values->>'opcion_b','') is null or nullif(v_values->>'opcion_c','') is null or nullif(v_values->>'opcion_d','') is null
       or nullif(v_values->>'tipo_trampa','') is null then
      raise exception 'ELI-44 mutation % contains empty required content', v_index using errcode='22023';
    end if;
    v_answer := v_values ->> 'respuesta_correcta';
    v_level := v_values ->> 'nivel_pedagogico';
    if v_answer not in ('A','B','C','D') or v_level not in ('aprendizaje','consolidacion','tribunal') then
      raise exception 'ELI-44 mutation % contains invalid answer or level', v_index using errcode='22023';
    end if;

    select * into v_q from public.questions q where q.id = v_question_id;
    if not found then raise exception 'ELI-44 question does not exist: %', v_question_id using errcode='P0001'; end if;
    if v_q.codigo is distinct from v_codigo then raise exception 'ELI-44 question_id/codigo mismatch for %', v_question_id using errcode='P0001'; end if;
    if v_q.opposition_id is distinct from v_requested_opposition_id then raise exception 'ELI-44 cross-opposition question rejected: %', v_codigo using errcode='42501'; end if;
    if v_q.topic_id is distinct from v_requested_topic_id then raise exception 'ELI-44 cross-topic question rejected: %', v_codigo using errcode='42501'; end if;
    if not v_q.activa then raise exception 'ELI-44 inactive question rejected: %', v_codigo using errcode='P0001'; end if;

    v_current_fp := encode(digest(convert_to(array_to_json(array[
      v_q.id::text,v_q.codigo,v_q.pregunta,v_q.opcion_a,v_q.opcion_b,v_q.opcion_c,v_q.opcion_d,
      v_q.respuesta_correcta::text,v_q.explicacion,v_q.nivel_pedagogico,v_q.tipo_trampa
    ]::text[])::text,'UTF8'),'sha256'),'hex');
    if v_current_fp is distinct from v_expected_fp then
      raise exception 'STALE_PACKAGE: current fingerprint mismatch for %', v_codigo using errcode='P0001';
    end if;

    if v_q.pregunta is not distinct from (v_values->>'pregunta')
       and v_q.opcion_a is not distinct from (v_values->>'opcion_a')
       and v_q.opcion_b is not distinct from (v_values->>'opcion_b')
       and v_q.opcion_c is not distinct from (v_values->>'opcion_c')
       and v_q.opcion_d is not distinct from (v_values->>'opcion_d')
       and v_q.respuesta_correcta::text is not distinct from (v_values->>'respuesta_correcta')
       and coalesce(v_q.explicacion,'') is not distinct from coalesce(v_values->>'explicacion','')
       and v_q.nivel_pedagogico is not distinct from (v_values->>'nivel_pedagogico')
       and v_q.tipo_trampa is not distinct from (v_values->>'tipo_trampa') then
      v_noop_count := v_noop_count + 1;
    end if;
  end loop;

  if v_edit_count <> v_expected_edits or v_replace_count <> v_expected_replaces then
    raise exception 'ELI-44 EDIT/REPLACE counts do not match expected counts' using errcode='22023';
  end if;
  if v_noop_count <> 0 then
    raise exception 'ELI-44 expected % mutations but % are no-op targets', v_expected_mutations, v_noop_count using errcode='P0001';
  end if;

  -- KEEP rows are fingerprinted too; they can participate in final preservation checks but are never updated.
  v_index := 0;
  for v_row in select value from jsonb_array_elements(v_keeps)
  loop
    v_index := v_index + 1;
    if jsonb_typeof(v_row) <> 'object' then raise exception 'ELI-44 KEEP % is not an object', v_index using errcode='22023'; end if;
    select array_agg(key order by key) into v_unknown_keys from jsonb_object_keys(v_row) keys(key)
    where key not in ('question_id','codigo','expected_current_fingerprint');
    if coalesce(cardinality(v_unknown_keys),0) > 0 then raise exception 'ELI-44 KEEP % contains unsupported keys', v_index using errcode='22023'; end if;
    begin v_question_id := nullif(v_row ->> 'question_id','')::uuid;
    exception when invalid_text_representation then raise exception 'ELI-44 KEEP % has invalid question_id', v_index using errcode='22023'; end;
    v_codigo := nullif(v_row ->> 'codigo','');
    v_expected_fp := nullif(v_row ->> 'expected_current_fingerprint','');
    if v_question_id is null or v_codigo is null or v_expected_fp is null or v_expected_fp !~ '^[0-9a-f]{64}$' then
      raise exception 'ELI-44 KEEP % is incomplete or invalid', v_index using errcode='22023';
    end if;
    select * into v_q from public.questions q where q.id = v_question_id;
    if not found then raise exception 'ELI-44 KEEP question does not exist: %', v_question_id using errcode='P0001'; end if;
    if v_q.codigo is distinct from v_codigo then raise exception 'ELI-44 KEEP question_id/codigo mismatch for %', v_question_id using errcode='P0001'; end if;
    if v_q.opposition_id is distinct from v_requested_opposition_id then raise exception 'ELI-44 KEEP cross-opposition question rejected: %', v_codigo using errcode='42501'; end if;
    if v_q.topic_id is distinct from v_requested_topic_id then raise exception 'ELI-44 KEEP cross-topic question rejected: %', v_codigo using errcode='42501'; end if;
    if not v_q.activa then raise exception 'ELI-44 inactive KEEP question rejected: %', v_codigo using errcode='P0001'; end if;
    v_current_fp := encode(digest(convert_to(array_to_json(array[
      v_q.id::text,v_q.codigo,v_q.pregunta,v_q.opcion_a,v_q.opcion_b,v_q.opcion_c,v_q.opcion_d,
      v_q.respuesta_correcta::text,v_q.explicacion,v_q.nivel_pedagogico,v_q.tipo_trampa
    ]::text[])::text,'UTF8'),'sha256'),'hex');
    if v_current_fp is distinct from v_expected_fp then raise exception 'STALE_PACKAGE: KEEP fingerprint mismatch for %', v_codigo using errcode='P0001'; end if;
  end loop;

  -- Recompute the exact package fingerprint. Mode and confirmation are intentionally excluded so a GREEN
  -- preflight can later be executed only with the same immutable package commitment.
  with mutation_commitments as (
    select (elem->>'question_id')::uuid as question_id,
           elem->>'codigo' as codigo,
           encode(digest(convert_to(array_to_json(array[
             elem->>'question_id', elem->>'codigo', elem->>'decision', elem->>'expected_current_fingerprint',
             elem->'new_values'->>'pregunta', elem->'new_values'->>'opcion_a', elem->'new_values'->>'opcion_b',
             elem->'new_values'->>'opcion_c', elem->'new_values'->>'opcion_d', elem->'new_values'->>'respuesta_correcta',
             elem->'new_values'->>'explicacion', elem->'new_values'->>'nivel_pedagogico', elem->'new_values'->>'tipo_trampa'
           ]::text[])::text,'UTF8'),'sha256'),'hex') as commitment
    from jsonb_array_elements(v_mutations) elem
  ), keep_commitments as (
    select (elem->>'question_id')::uuid as question_id,
           elem->>'codigo' as codigo,
           encode(digest(convert_to(array_to_json(array[
             elem->>'question_id', elem->>'codigo', 'KEEP', elem->>'expected_current_fingerprint'
           ]::text[])::text,'UTF8'),'sha256'),'hex') as commitment
    from jsonb_array_elements(v_keeps) elem
  )
  select encode(digest(convert_to(array_to_json(array[
    v_package_id, v_requested_opposition_id::text, v_requested_topic_id::text,
    v_expected_active::text,v_expected_mutations::text,v_expected_keeps::text,v_expected_edits::text,v_expected_replaces::text,
    v_expected_aprendizaje::text,v_expected_consolidacion::text,v_expected_tribunal::text,
    v_expected_a::text,v_expected_b::text,v_expected_c::text,v_expected_d::text,
    v_expected_primary::text,v_expected_units::text,v_expected_concepts::text,v_expected_flashcards::text,
    coalesce((select string_agg(commitment,',' order by question_id,codigo) from mutation_commitments),''),
    coalesce((select string_agg(commitment,',' order by question_id,codigo) from keep_commitments),'')
  ]::text[])::text,'UTF8'),'sha256'),'hex')
  into v_computed_package_fingerprint;
  if v_computed_package_fingerprint is distinct from v_package_fingerprint then
    raise exception 'PACKAGE_FINGERPRINT_MISMATCH' using errcode='P0001';
  end if;
  if v_mode='execute' and v_confirmation is distinct from ('APPLY_CELADOR_QUESTION_HARDENING:' || v_package_fingerprint) then
    raise exception 'ELI-44 execute requires exact package-bound confirmation' using errcode='42501';
  end if;

  select count(*) into v_active_count from public.questions q
  where q.opposition_id=v_requested_opposition_id and q.topic_id=v_requested_topic_id and q.activa;
  select count(*) into v_primary_count from public.question_concepts qc
  where qc.opposition_id=v_requested_opposition_id and qc.topic_id=v_requested_topic_id and qc.role='primary';
  select count(*) into v_units_count from public.study_units u
  where u.opposition_id=v_requested_opposition_id and u.topic_id=v_requested_topic_id and u.active;
  select count(*) into v_concepts_count from public.concepts c
  where c.opposition_id=v_requested_opposition_id and c.topic_id=v_requested_topic_id and c.active;
  select count(*) into v_flashcards_count from public.flashcards f
  join public.concepts c on c.id=f.concept_id
  where f.opposition_id=v_requested_opposition_id and c.opposition_id=v_requested_opposition_id
    and c.topic_id=v_requested_topic_id and f.active;
  if v_active_count <> v_expected_active or v_primary_count <> v_expected_primary or v_units_count <> v_expected_units
     or v_concepts_count <> v_expected_concepts or v_flashcards_count <> v_expected_flashcards then
    raise exception 'ELI-44 precondition count mismatch: active %, PRIMARY %, units %, concepts %, flashcards %',
      v_active_count,v_primary_count,v_units_count,v_concepts_count,v_flashcards_count using errcode='P0001';
  end if;

  -- Prove the package exactly covers the active bank: all supplied identities already resolved active in scope,
  -- row counts are unique, and supplied total equals active count.
  select count(*) into v_existing_count from (
    select elem->>'question_id' id from jsonb_array_elements(v_mutations) elem
    union all select elem->>'question_id' id from jsonb_array_elements(v_keeps) elem
  ) supplied;
  if v_existing_count <> v_active_count then raise exception 'ELI-44 package does not cover the complete active topic bank' using errcode='P0001'; end if;

  -- Virtual projected final state: current KEEP rows plus mutation overlay.
  with targets as (
    select (elem->>'question_id')::uuid id, elem->'new_values' values
    from jsonb_array_elements(v_mutations) elem
  )
  select count(*) filter (where coalesce(t.values->>'nivel_pedagogico',q.nivel_pedagogico)='aprendizaje'),
         count(*) filter (where coalesce(t.values->>'nivel_pedagogico',q.nivel_pedagogico)='consolidacion'),
         count(*) filter (where coalesce(t.values->>'nivel_pedagogico',q.nivel_pedagogico)='tribunal'),
         count(*) filter (where coalesce(t.values->>'respuesta_correcta',q.respuesta_correcta::text)='A'),
         count(*) filter (where coalesce(t.values->>'respuesta_correcta',q.respuesta_correcta::text)='B'),
         count(*) filter (where coalesce(t.values->>'respuesta_correcta',q.respuesta_correcta::text)='C'),
         count(*) filter (where coalesce(t.values->>'respuesta_correcta',q.respuesta_correcta::text)='D')
  into v_projected_aprendizaje,v_projected_consolidacion,v_projected_tribunal,
       v_projected_a,v_projected_b,v_projected_c,v_projected_d
  from public.questions q left join targets t on t.id=q.id
  where q.opposition_id=v_requested_opposition_id and q.topic_id=v_requested_topic_id and q.activa;
  if v_projected_aprendizaje<>v_expected_aprendizaje or v_projected_consolidacion<>v_expected_consolidacion
     or v_projected_tribunal<>v_expected_tribunal or v_projected_a<>v_expected_a or v_projected_b<>v_expected_b
     or v_projected_c<>v_expected_c or v_projected_d<>v_expected_d then
    raise exception 'ELI-44 projected final distribution mismatch' using errcode='P0001';
  end if;

  if v_mode='preflight' then
    return jsonb_build_object(
      'result','PASS','mode','preflight','package_id',v_package_id,'package_fingerprint',v_package_fingerprint,
      'opposition_id',v_requested_opposition_id,'topic_id',v_requested_topic_id,'academic_writes',0,
      'active_questions',v_active_count,'mutations',v_expected_mutations,'keeps',v_expected_keeps,
      'edits',v_expected_edits,'replaces',v_expected_replaces,
      'mutation_fingerprints_matched',v_expected_mutations,'keep_fingerprints_matched',v_expected_keeps,
      'projected_levels',jsonb_build_object('aprendizaje',v_projected_aprendizaje,'consolidacion',v_projected_consolidacion,'tribunal',v_projected_tribunal),
      'projected_answers',jsonb_build_object('A',v_projected_a,'B',v_projected_b,'C',v_projected_c,'D',v_projected_d),
      'primary_mappings',v_primary_count,'study_units',v_units_count,'concepts',v_concepts_count,'flashcards',v_flashcards_count
    );
  end if;

  -- EXECUTE re-locks the complete supplied bank and re-runs the audit-time fingerprints under row locks.
  -- This closes the check/write race: once these SELECT ... FOR UPDATE checks pass, no concurrent question
  -- writer can alter a covered row before the atomic UPDATE/postconditions complete.
  for v_row in
    select elem from jsonb_array_elements(v_mutations) elem
    union all
    select elem from jsonb_array_elements(v_keeps) elem
  loop
    v_question_id := (v_row->>'question_id')::uuid;
    v_codigo := v_row->>'codigo';
    v_expected_fp := v_row->>'expected_current_fingerprint';
    select * into v_q
    from public.questions q
    where q.id=v_question_id
    for update;
    if not found then raise exception 'ELI-44 locked question does not exist: %', v_question_id using errcode='P0001'; end if;
    if v_q.codigo is distinct from v_codigo then raise exception 'ELI-44 locked question_id/codigo mismatch for %', v_question_id using errcode='P0001'; end if;
    if v_q.opposition_id is distinct from v_requested_opposition_id then raise exception 'ELI-44 locked cross-opposition question rejected: %', v_codigo using errcode='42501'; end if;
    if v_q.topic_id is distinct from v_requested_topic_id then raise exception 'ELI-44 locked cross-topic question rejected: %', v_codigo using errcode='42501'; end if;
    if not v_q.activa then raise exception 'ELI-44 locked inactive question rejected: %', v_codigo using errcode='P0001'; end if;
    v_current_fp := encode(digest(convert_to(array_to_json(array[
      v_q.id::text,v_q.codigo,v_q.pregunta,v_q.opcion_a,v_q.opcion_b,v_q.opcion_c,v_q.opcion_d,
      v_q.respuesta_correcta::text,v_q.explicacion,v_q.nivel_pedagogico,v_q.tipo_trampa
    ]::text[])::text,'UTF8'),'sha256'),'hex');
    if v_current_fp is distinct from v_expected_fp then
      raise exception 'STALE_PACKAGE: locked current fingerprint mismatch for %', v_codigo using errcode='P0001';
    end if;
  end loop;

  -- Pre-write preservation hashes. These cover every question field outside the explicit mutable allowlist,
  -- plus the linked learning-graph tables which ELI-44 is forbidden to mutate.
  select encode(digest(convert_to(coalesce(string_agg(array_to_json(array[
    q.id::text,q.user_id::text,q.codigo,q.subject_id::text,q.topic_id::text,q.subtopic_id::text,
    q.dificultad::text,q.concepto,q.objetivo_aprendizaje,q.referencia_fuente,q.activa::text,q.created_at::text,
    q.apartado,q.perspectiva,q.dificultad_conceptual::text,q.dificultad_examen::text,q.documento_referencia,
    q.pagina_inicio::text,q.pagina_fin::text,q.frecuencia_historica,q.opposition_id::text
  ]::text[])::text,E'\n' order by q.id),''),'UTF8'),'sha256'),'hex') into v_immutable_before
  from public.questions q where q.opposition_id=v_requested_opposition_id and q.topic_id=v_requested_topic_id and q.activa;

  select encode(digest(convert_to(coalesce(string_agg(row_to_json(x)::text,E'\n' order by x.question_id,x.concept_id,x.role),''),'UTF8'),'sha256'),'hex') into v_qc_before
  from (select qc.* from public.question_concepts qc where qc.opposition_id=v_requested_opposition_id and qc.topic_id=v_requested_topic_id) x;
  select encode(digest(convert_to(coalesce(string_agg(row_to_json(x)::text,E'\n' order by x.id),''),'UTF8'),'sha256'),'hex') into v_units_before
  from (select u.* from public.study_units u where u.opposition_id=v_requested_opposition_id and u.topic_id=v_requested_topic_id) x;
  select encode(digest(convert_to(coalesce(string_agg(row_to_json(x)::text,E'\n' order by x.id),''),'UTF8'),'sha256'),'hex') into v_concepts_before
  from (select c.* from public.concepts c where c.opposition_id=v_requested_opposition_id and c.topic_id=v_requested_topic_id) x;
  select encode(digest(convert_to(coalesce(string_agg(row_to_json(x)::text,E'\n' order by x.id),''),'UTF8'),'sha256'),'hex') into v_flashcards_before
  from (select f.* from public.flashcards f join public.concepts c on c.id=f.concept_id
        where f.opposition_id=v_requested_opposition_id and c.opposition_id=v_requested_opposition_id and c.topic_id=v_requested_topic_id) x;

  -- Only the nine allowlisted fields can be assigned, and identity is resolved by BOTH id and codigo in the locked scope.
  for v_row in select value from jsonb_array_elements(v_mutations)
  loop
    v_question_id := (v_row->>'question_id')::uuid;
    v_codigo := v_row->>'codigo';
    v_values := v_row->'new_values';
    update public.questions q set
      pregunta = v_values->>'pregunta',
      opcion_a = v_values->>'opcion_a',
      opcion_b = v_values->>'opcion_b',
      opcion_c = v_values->>'opcion_c',
      opcion_d = v_values->>'opcion_d',
      respuesta_correcta = (v_values->>'respuesta_correcta')::public.respuesta_enum,
      explicacion = v_values->>'explicacion',
      nivel_pedagogico = v_values->>'nivel_pedagogico',
      tipo_trampa = v_values->>'tipo_trampa'
    where q.id=v_question_id and q.codigo=v_codigo and q.opposition_id=v_requested_opposition_id
      and q.topic_id=v_requested_topic_id and q.activa;
    get diagnostics v_affected = row_count;
    if v_affected <> 1 then raise exception 'ELI-44 atomic update lost identity for %', v_codigo using errcode='P0001'; end if;
  end loop;

  -- Exact target equality proves all planned mutations landed before commit.
  select count(*) into v_target_match_count
  from jsonb_array_elements(v_mutations) elem
  join public.questions q on q.id=(elem->>'question_id')::uuid and q.codigo=elem->>'codigo'
  where q.opposition_id=v_requested_opposition_id and q.topic_id=v_requested_topic_id and q.activa
    and q.pregunta is not distinct from elem->'new_values'->>'pregunta'
    and q.opcion_a is not distinct from elem->'new_values'->>'opcion_a'
    and q.opcion_b is not distinct from elem->'new_values'->>'opcion_b'
    and q.opcion_c is not distinct from elem->'new_values'->>'opcion_c'
    and q.opcion_d is not distinct from elem->'new_values'->>'opcion_d'
    and q.respuesta_correcta::text is not distinct from elem->'new_values'->>'respuesta_correcta'
    and coalesce(q.explicacion,'') is not distinct from coalesce(elem->'new_values'->>'explicacion','')
    and q.nivel_pedagogico is not distinct from elem->'new_values'->>'nivel_pedagogico'
    and q.tipo_trampa is not distinct from elem->'new_values'->>'tipo_trampa';
  if v_target_match_count <> v_expected_mutations then raise exception 'ELI-44 postcondition target mismatch' using errcode='P0001'; end if;

  -- KEEP rows must still equal their audit-time fingerprints.
  for v_row in select value from jsonb_array_elements(v_keeps)
  loop
    select * into v_q from public.questions q where q.id=(v_row->>'question_id')::uuid and q.codigo=v_row->>'codigo';
    v_current_fp := encode(digest(convert_to(array_to_json(array[
      v_q.id::text,v_q.codigo,v_q.pregunta,v_q.opcion_a,v_q.opcion_b,v_q.opcion_c,v_q.opcion_d,
      v_q.respuesta_correcta::text,v_q.explicacion,v_q.nivel_pedagogico,v_q.tipo_trampa
    ]::text[])::text,'UTF8'),'sha256'),'hex');
    if v_current_fp is distinct from (v_row->>'expected_current_fingerprint') then
      raise exception 'ELI-44 KEEP changed during execute: %', v_q.codigo using errcode='P0001';
    end if;
  end loop;

  select count(*),
         count(*) filter(where q.nivel_pedagogico='aprendizaje'),
         count(*) filter(where q.nivel_pedagogico='consolidacion'),
         count(*) filter(where q.nivel_pedagogico='tribunal'),
         count(*) filter(where q.respuesta_correcta::text='A'),count(*) filter(where q.respuesta_correcta::text='B'),
         count(*) filter(where q.respuesta_correcta::text='C'),count(*) filter(where q.respuesta_correcta::text='D')
  into v_active_count,v_projected_aprendizaje,v_projected_consolidacion,v_projected_tribunal,
       v_projected_a,v_projected_b,v_projected_c,v_projected_d
  from public.questions q where q.opposition_id=v_requested_opposition_id and q.topic_id=v_requested_topic_id and q.activa;
  select count(*) into v_primary_count from public.question_concepts qc where qc.opposition_id=v_requested_opposition_id and qc.topic_id=v_requested_topic_id and qc.role='primary';
  select count(*) into v_units_count from public.study_units u where u.opposition_id=v_requested_opposition_id and u.topic_id=v_requested_topic_id and u.active;
  select count(*) into v_concepts_count from public.concepts c where c.opposition_id=v_requested_opposition_id and c.topic_id=v_requested_topic_id and c.active;
  select count(*) into v_flashcards_count from public.flashcards f join public.concepts c on c.id=f.concept_id
    where f.opposition_id=v_requested_opposition_id and c.opposition_id=v_requested_opposition_id and c.topic_id=v_requested_topic_id and f.active;
  if v_active_count<>v_expected_active or v_projected_aprendizaje<>v_expected_aprendizaje or v_projected_consolidacion<>v_expected_consolidacion
     or v_projected_tribunal<>v_expected_tribunal or v_projected_a<>v_expected_a or v_projected_b<>v_expected_b
     or v_projected_c<>v_expected_c or v_projected_d<>v_expected_d or v_primary_count<>v_expected_primary
     or v_units_count<>v_expected_units or v_concepts_count<>v_expected_concepts or v_flashcards_count<>v_expected_flashcards then
    raise exception 'ELI-44 postcondition count/distribution mismatch' using errcode='P0001';
  end if;

  select encode(digest(convert_to(coalesce(string_agg(array_to_json(array[
    q.id::text,q.user_id::text,q.codigo,q.subject_id::text,q.topic_id::text,q.subtopic_id::text,
    q.dificultad::text,q.concepto,q.objetivo_aprendizaje,q.referencia_fuente,q.activa::text,q.created_at::text,
    q.apartado,q.perspectiva,q.dificultad_conceptual::text,q.dificultad_examen::text,q.documento_referencia,
    q.pagina_inicio::text,q.pagina_fin::text,q.frecuencia_historica,q.opposition_id::text
  ]::text[])::text,E'\n' order by q.id),''),'UTF8'),'sha256'),'hex') into v_immutable_after
  from public.questions q where q.opposition_id=v_requested_opposition_id and q.topic_id=v_requested_topic_id and q.activa;
  select encode(digest(convert_to(coalesce(string_agg(row_to_json(x)::text,E'\n' order by x.question_id,x.concept_id,x.role),''),'UTF8'),'sha256'),'hex') into v_qc_after
  from (select qc.* from public.question_concepts qc where qc.opposition_id=v_requested_opposition_id and qc.topic_id=v_requested_topic_id) x;
  select encode(digest(convert_to(coalesce(string_agg(row_to_json(x)::text,E'\n' order by x.id),''),'UTF8'),'sha256'),'hex') into v_units_after
  from (select u.* from public.study_units u where u.opposition_id=v_requested_opposition_id and u.topic_id=v_requested_topic_id) x;
  select encode(digest(convert_to(coalesce(string_agg(row_to_json(x)::text,E'\n' order by x.id),''),'UTF8'),'sha256'),'hex') into v_concepts_after
  from (select c.* from public.concepts c where c.opposition_id=v_requested_opposition_id and c.topic_id=v_requested_topic_id) x;
  select encode(digest(convert_to(coalesce(string_agg(row_to_json(x)::text,E'\n' order by x.id),''),'UTF8'),'sha256'),'hex') into v_flashcards_after
  from (select f.* from public.flashcards f join public.concepts c on c.id=f.concept_id
        where f.opposition_id=v_requested_opposition_id and c.opposition_id=v_requested_opposition_id and c.topic_id=v_requested_topic_id) x;
  if v_immutable_before is distinct from v_immutable_after or v_qc_before is distinct from v_qc_after
     or v_units_before is distinct from v_units_after or v_concepts_before is distinct from v_concepts_after
     or v_flashcards_before is distinct from v_flashcards_after then
    raise exception 'ELI-44 preservation hash mismatch; rolling back' using errcode='P0001';
  end if;

  return jsonb_build_object(
    'result','PASS','mode','execute','package_id',v_package_id,'package_fingerprint',v_package_fingerprint,
    'opposition_id',v_requested_opposition_id,'topic_id',v_requested_topic_id,
    'academic_writes',v_expected_mutations,'mutations',v_expected_mutations,'keeps_unchanged',v_expected_keeps,
    'levels',jsonb_build_object('aprendizaje',v_projected_aprendizaje,'consolidacion',v_projected_consolidacion,'tribunal',v_projected_tribunal),
    'answers',jsonb_build_object('A',v_projected_a,'B',v_projected_b,'C',v_projected_c,'D',v_projected_d),
    'primary_mappings',v_primary_count,'study_units',v_units_count,'concepts',v_concepts_count,'flashcards',v_flashcards_count,
    'preservation_hashes','PASS'
  );
end;
$function$;

revoke all on function public.execute_celador_question_hardening(jsonb) from public;
revoke all on function public.execute_celador_question_hardening(jsonb) from anon;
revoke all on function public.execute_celador_question_hardening(jsonb) from service_role;
grant execute on function public.execute_celador_question_hardening(jsonb) to authenticated;

comment on function public.execute_celador_question_hardening(jsonb) is
'ELI-44 narrow SECURITY INVOKER executor for authenticated Celador existing-question hardening only; probe/preflight/execute; package-bound stale fingerprint and atomic postconditions.';
