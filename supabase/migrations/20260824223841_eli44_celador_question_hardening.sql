-- ELI-44 · Authenticated Celador existing-question hardening executor.
-- Infrastructure only. Installing this function does not mutate academic rows.
-- SECURITY INVOKER: all reads/updates remain subject to the authenticated caller's RLS privileges.

create or replace function public.execute_celador_question_hardening(p_package jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, extensions, pg_temp
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
  v_recomputed_package_fingerprint text;
  v_confirmation text;
  v_unknown_keys text[];
  v_mutation_aggregate text;
  v_keep_aggregate text;
  v_current_fp text;
  v_bad_code text;
  v_rows integer;
  v_edit_count integer;
  v_replace_count integer;
  v_keep_count integer;
  v_active_questions integer;
  v_primary_mappings integer;
  v_study_units integer;
  v_concepts integer;
  v_flashcards integer;
  v_level_aprendizaje integer;
  v_level_consolidacion integer;
  v_level_tribunal integer;
  v_answer_a integer;
  v_answer_b integer;
  v_answer_c integer;
  v_answer_d integer;
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
  v_questions_preserved_before text;
  v_questions_preserved_after text;
  v_qc_before text;
  v_qc_after text;
  v_units_before text;
  v_units_after text;
  v_concepts_before text;
  v_concepts_after text;
  v_flashcards_before text;
  v_flashcards_after text;
  v_aux_active_before integer;
  v_aux_active_after integer;
  v_celador_outside_before integer;
  v_celador_outside_after integer;
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

  if v_package_id is null or v_package_id not in (v_probe_package_id, v_hardening_package_id) then
    raise exception 'ELI-44 package is not allowlisted' using errcode = '22023';
  end if;

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
      raise exception 'ELI-44 probe only supports mode=probe' using errcode = '22023';
    end if;
    if v_requested_topic_id is not null or v_package_fingerprint is not null or v_confirmation is not null
       or p_package ? 'expected' or p_package ? 'mutations' or p_package ? 'keeps' then
      raise exception 'ELI-44 probe accepts only package_id, mode and opposition_id' using errcode = '22023';
    end if;

    select count(*) filter (where q.activa)
      into v_active_questions
    from public.questions q
    where q.opposition_id = v_celador_opposition_id
      and q.topic_id = v_t11_topic_id;

    return jsonb_build_object(
      'result','PASS',
      'package_id',v_package_id,
      'mode','probe',
      'authenticated',true,
      'celador_admin',true,
      'active_opposition_id',v_celador_opposition_id,
      'academic_writes',0,
      't11_active_questions',v_active_questions
    );
  end if;

  -- Hardening packages are scoped to one existing Celador topic and package fingerprint.
  if v_requested_topic_id is null then
    raise exception 'ELI-44 requires an explicit topic_id' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.topics t
    where t.id = v_requested_topic_id and t.opposition_id = v_celador_opposition_id
  ) then
    raise exception 'ELI-44 topic_id is not a Celador topic' using errcode = '42501';
  end if;
  if v_mode is null or v_mode not in ('preflight','execute') then
    raise exception 'ELI-44 hardening mode must be preflight or execute' using errcode = '22023';
  end if;
  if v_package_fingerprint is null or v_package_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'ELI-44 requires a lowercase SHA-256 package fingerprint' using errcode = '22023';
  end if;
  if v_mode = 'preflight' and v_confirmation is not null then
    raise exception 'ELI-44 preflight does not accept confirmation' using errcode = '22023';
  end if;
  if v_mode = 'execute' and v_confirmation is distinct from ('APPLY_CELADOR_QUESTION_HARDENING:' || v_package_fingerprint) then
    raise exception 'ELI-44 execute confirmation does not match the package fingerprint' using errcode = '42501';
  end if;
  if jsonb_typeof(p_package -> 'expected') <> 'object'
     or jsonb_typeof(p_package -> 'mutations') <> 'array'
     or jsonb_typeof(p_package -> 'keeps') <> 'array' then
    raise exception 'ELI-44 hardening package requires expected object plus mutations/keeps arrays' using errcode = '22023';
  end if;

  select array_agg(key order by key) into v_unknown_keys
  from jsonb_object_keys(p_package -> 'expected') keys(key)
  where key not in ('active_questions','mutation_count','keep_count','edit_count','replace_count','levels','answers','primary_mappings','study_units','concepts','flashcards');
  if coalesce(cardinality(v_unknown_keys),0) > 0 then
    raise exception 'ELI-44 expected contains unsupported keys: %', array_to_string(v_unknown_keys, ', ') using errcode='22023';
  end if;
  if jsonb_typeof(p_package #> '{expected,levels}') <> 'object'
     or jsonb_typeof(p_package #> '{expected,answers}') <> 'object' then
    raise exception 'ELI-44 expected.levels and expected.answers must be objects' using errcode='22023';
  end if;
  select array_agg(key order by key) into v_unknown_keys
  from jsonb_object_keys(p_package #> '{expected,levels}') keys(key)
  where key not in ('aprendizaje','consolidacion','tribunal');
  if coalesce(cardinality(v_unknown_keys),0) > 0 then
    raise exception 'ELI-44 expected.levels contains unsupported keys' using errcode='22023';
  end if;
  select array_agg(key order by key) into v_unknown_keys
  from jsonb_object_keys(p_package #> '{expected,answers}') keys(key)
  where key not in ('A','B','C','D');
  if coalesce(cardinality(v_unknown_keys),0) > 0 then
    raise exception 'ELI-44 expected.answers contains unsupported keys' using errcode='22023';
  end if;

  begin
    v_expected_active := (p_package #>> '{expected,active_questions}')::integer;
    v_expected_mutations := (p_package #>> '{expected,mutation_count}')::integer;
    v_expected_keeps := (p_package #>> '{expected,keep_count}')::integer;
    v_expected_edits := (p_package #>> '{expected,edit_count}')::integer;
    v_expected_replaces := (p_package #>> '{expected,replace_count}')::integer;
    v_expected_aprendizaje := (p_package #>> '{expected,levels,aprendizaje}')::integer;
    v_expected_consolidacion := (p_package #>> '{expected,levels,consolidacion}')::integer;
    v_expected_tribunal := (p_package #>> '{expected,levels,tribunal}')::integer;
    v_expected_a := (p_package #>> '{expected,answers,A}')::integer;
    v_expected_b := (p_package #>> '{expected,answers,B}')::integer;
    v_expected_c := (p_package #>> '{expected,answers,C}')::integer;
    v_expected_d := (p_package #>> '{expected,answers,D}')::integer;
    v_expected_primary := (p_package #>> '{expected,primary_mappings}')::integer;
    v_expected_units := (p_package #>> '{expected,study_units}')::integer;
    v_expected_concepts := (p_package #>> '{expected,concepts}')::integer;
    v_expected_flashcards := (p_package #>> '{expected,flashcards}')::integer;
  exception when others then
    raise exception 'ELI-44 expected metrics must be integers' using errcode='22023';
  end;

  if v_expected_active is null or v_expected_mutations is null or v_expected_keeps is null
     or v_expected_edits is null or v_expected_replaces is null
     or v_expected_aprendizaje is null or v_expected_consolidacion is null or v_expected_tribunal is null
     or v_expected_a is null or v_expected_b is null or v_expected_c is null or v_expected_d is null
     or v_expected_primary is null or v_expected_units is null or v_expected_concepts is null or v_expected_flashcards is null then
    raise exception 'ELI-44 expected metrics are incomplete' using errcode='22023';
  end if;
  if v_expected_active <= 0 or v_expected_mutations <= 0 or v_expected_mutations + v_expected_keeps <> v_expected_active
     or v_expected_edits + v_expected_replaces <> v_expected_mutations
     or v_expected_aprendizaje + v_expected_consolidacion + v_expected_tribunal <> v_expected_active
     or v_expected_a + v_expected_b + v_expected_c + v_expected_d <> v_expected_active then
    raise exception 'ELI-44 expected metrics are internally inconsistent' using errcode='22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_package -> 'mutations') m,
      lateral jsonb_object_keys(m) keys(key)
    where key not in ('question_id','codigo','decision','expected_current_fingerprint','new_values')
  ) then
    raise exception 'ELI-44 mutation contains an unsupported field' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_package -> 'mutations') m
    where jsonb_typeof(m -> 'new_values') <> 'object'
  ) then
    raise exception 'ELI-44 mutation.new_values must be an object' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_package -> 'mutations') m,
      lateral jsonb_object_keys(m -> 'new_values') keys(key)
    where key not in ('pregunta','opcion_a','opcion_b','opcion_c','opcion_d','respuesta_correcta','explicacion','nivel_pedagogico','tipo_trampa')
  ) then
    raise exception 'ELI-44 new_values contains a non-allowlisted field' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_package -> 'keeps') k,
      lateral jsonb_object_keys(k) keys(key)
    where key not in ('question_id','codigo','expected_current_fingerprint')
  ) then
    raise exception 'ELI-44 KEEP contains an unsupported field' using errcode='22023';
  end if;

  drop table if exists pg_temp.eli44_mutations;
  drop table if exists pg_temp.eli44_keeps;
  create temporary table eli44_mutations (
    question_id uuid primary key,
    codigo text not null unique,
    decision text not null,
    expected_current_fingerprint text not null,
    pregunta text not null,
    opcion_a text not null,
    opcion_b text not null,
    opcion_c text not null,
    opcion_d text not null,
    respuesta_correcta text not null,
    explicacion text not null,
    nivel_pedagogico text not null,
    tipo_trampa text not null
  ) on commit drop;
  create temporary table eli44_keeps (
    question_id uuid primary key,
    codigo text not null unique,
    expected_current_fingerprint text not null
  ) on commit drop;

  begin
    insert into pg_temp.eli44_mutations
      (question_id,codigo,decision,expected_current_fingerprint,pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta,explicacion,nivel_pedagogico,tipo_trampa)
    select
      (m ->> 'question_id')::uuid,
      m ->> 'codigo',
      m ->> 'decision',
      m ->> 'expected_current_fingerprint',
      m #>> '{new_values,pregunta}',
      m #>> '{new_values,opcion_a}',
      m #>> '{new_values,opcion_b}',
      m #>> '{new_values,opcion_c}',
      m #>> '{new_values,opcion_d}',
      m #>> '{new_values,respuesta_correcta}',
      m #>> '{new_values,explicacion}',
      m #>> '{new_values,nivel_pedagogico}',
      m #>> '{new_values,tipo_trampa}'
    from jsonb_array_elements(p_package -> 'mutations') m;

    insert into pg_temp.eli44_keeps(question_id,codigo,expected_current_fingerprint)
    select (k ->> 'question_id')::uuid, k ->> 'codigo', k ->> 'expected_current_fingerprint'
    from jsonb_array_elements(p_package -> 'keeps') k;
  exception
    when invalid_text_representation or unique_violation or not_null_violation then
      raise exception 'ELI-44 package identities/required values are invalid or duplicated' using errcode='22023';
  end;

  if exists (select 1 from pg_temp.eli44_mutations where decision not in ('EDIT','REPLACE'))
     or exists (select 1 from pg_temp.eli44_mutations where respuesta_correcta not in ('A','B','C','D'))
     or exists (select 1 from pg_temp.eli44_mutations where nivel_pedagogico not in ('aprendizaje','consolidacion','tribunal'))
     or exists (select 1 from pg_temp.eli44_mutations where expected_current_fingerprint !~ '^[0-9a-f]{64}$')
     or exists (select 1 from pg_temp.eli44_keeps where expected_current_fingerprint !~ '^[0-9a-f]{64}$') then
    raise exception 'ELI-44 package contains an invalid decision/answer/level/fingerprint' using errcode='22023';
  end if;
  if exists (
    select 1 from pg_temp.eli44_mutations
    where codigo='' or pregunta='' or opcion_a='' or opcion_b='' or opcion_c='' or opcion_d='' or tipo_trampa=''
  ) then
    raise exception 'ELI-44 mutation contains an empty required academic field' using errcode='22023';
  end if;
  if exists (
    select 1 from pg_temp.eli44_mutations m join pg_temp.eli44_keeps k
      on k.question_id=m.question_id or k.codigo=m.codigo
  ) then
    raise exception 'ELI-44 package contains overlapping mutation/KEEP identities' using errcode='22023';
  end if;

  select count(*), count(*) filter (where decision='EDIT'), count(*) filter (where decision='REPLACE')
    into v_rows,v_edit_count,v_replace_count from pg_temp.eli44_mutations;
  select count(*) into v_keep_count from pg_temp.eli44_keeps;
  if v_rows <> v_expected_mutations or v_edit_count <> v_expected_edits or v_replace_count <> v_expected_replaces or v_keep_count <> v_expected_keeps then
    raise exception 'ELI-44 package row counts do not match expected metrics' using errcode='22023';
  end if;

  select string_agg(
    encode(digest(array_to_json(array[
      question_id::text,codigo,decision,expected_current_fingerprint,pregunta,opcion_a,opcion_b,opcion_c,opcion_d,
      respuesta_correcta,explicacion,nivel_pedagogico,tipo_trampa
    ]::text[])::text,'sha256'),'hex'), ',' order by question_id::text,codigo
  ) into v_mutation_aggregate from pg_temp.eli44_mutations;
  select string_agg(
    encode(digest(array_to_json(array[
      question_id::text,codigo,'KEEP',expected_current_fingerprint
    ]::text[])::text,'sha256'),'hex'), ',' order by question_id::text,codigo
  ) into v_keep_aggregate from pg_temp.eli44_keeps;

  v_recomputed_package_fingerprint := encode(digest(array_to_json(array[
    v_hardening_package_id,v_celador_opposition_id::text,v_requested_topic_id::text,
    v_expected_active::text,v_expected_mutations::text,v_expected_keeps::text,v_expected_edits::text,v_expected_replaces::text,
    v_expected_aprendizaje::text,v_expected_consolidacion::text,v_expected_tribunal::text,
    v_expected_a::text,v_expected_b::text,v_expected_c::text,v_expected_d::text,
    v_expected_primary::text,v_expected_units::text,v_expected_concepts::text,v_expected_flashcards::text,
    coalesce(v_mutation_aggregate,''),coalesce(v_keep_aggregate,'')
  ]::text[])::text,'sha256'),'hex');
  if v_recomputed_package_fingerprint is distinct from v_package_fingerprint then
    raise exception 'PACKAGE_FINGERPRINT_MISMATCH' using errcode='P0001';
  end if;

  -- Prove each supplied identity is the same active question in the locked opposition/topic.
  for v_bad_code in
    select p.codigo
    from (
      select question_id,codigo from pg_temp.eli44_mutations
      union all
      select question_id,codigo from pg_temp.eli44_keeps
    ) p
    left join public.questions q on q.id=p.question_id
    where q.id is null
    limit 1
  loop
    raise exception 'ELI-44 question does not exist: %', v_bad_code using errcode='P0001';
  end loop;
  for v_bad_code in
    select p.codigo
    from (
      select question_id,codigo from pg_temp.eli44_mutations
      union all
      select question_id,codigo from pg_temp.eli44_keeps
    ) p
    join public.questions q on q.id=p.question_id
    where q.codigo is distinct from p.codigo
    limit 1
  loop
    raise exception 'ELI-44 question_id/codigo mismatch: %', v_bad_code using errcode='P0001';
  end loop;
  for v_bad_code in
    select p.codigo
    from (
      select question_id,codigo from pg_temp.eli44_mutations
      union all
      select question_id,codigo from pg_temp.eli44_keeps
    ) p
    join public.questions q on q.id=p.question_id
    where q.opposition_id is distinct from v_celador_opposition_id
    limit 1
  loop
    raise exception 'ELI-44 cross-opposition question rejected: %', v_bad_code using errcode='P0001';
  end loop;
  for v_bad_code in
    select p.codigo
    from (
      select question_id,codigo from pg_temp.eli44_mutations
      union all
      select question_id,codigo from pg_temp.eli44_keeps
    ) p
    join public.questions q on q.id=p.question_id
    where q.topic_id is distinct from v_requested_topic_id
    limit 1
  loop
    raise exception 'ELI-44 cross-topic question rejected: %', v_bad_code using errcode='P0001';
  end loop;
  for v_bad_code in
    select p.codigo
    from (
      select question_id,codigo from pg_temp.eli44_mutations
      union all
      select question_id,codigo from pg_temp.eli44_keeps
    ) p
    join public.questions q on q.id=p.question_id
    where not q.activa
    limit 1
  loop
    raise exception 'ELI-44 inactive question rejected: %', v_bad_code using errcode='P0001';
  end loop;

  -- Mandatory stale-package guard against the frozen state on which the audit was made.
  for v_bad_code, v_current_fp in
    select p.codigo,
      encode(digest(array_to_json(array[
        q.id::text,q.codigo,q.pregunta,q.opcion_a,q.opcion_b,q.opcion_c,q.opcion_d,q.respuesta_correcta::text,
        q.explicacion,q.nivel_pedagogico,q.tipo_trampa
      ]::text[])::text,'sha256'),'hex')
    from (
      select question_id,codigo,expected_current_fingerprint from pg_temp.eli44_mutations
      union all
      select question_id,codigo,expected_current_fingerprint from pg_temp.eli44_keeps
    ) p
    join public.questions q on q.id=p.question_id
    where encode(digest(array_to_json(array[
        q.id::text,q.codigo,q.pregunta,q.opcion_a,q.opcion_b,q.opcion_c,q.opcion_d,q.respuesta_correcta::text,
        q.explicacion,q.nivel_pedagogico,q.tipo_trampa
      ]::text[])::text,'sha256'),'hex') is distinct from p.expected_current_fingerprint
    limit 1
  loop
    raise exception 'STALE_PACKAGE: current fingerprint mismatch for %', v_bad_code using errcode='P0001';
  end loop;

  select count(*) filter (where q.activa) into v_active_questions
  from public.questions q where q.opposition_id=v_celador_opposition_id and q.topic_id=v_requested_topic_id;
  select count(*) into v_primary_mappings
  from public.question_concepts qc join public.questions q on q.id=qc.question_id
  where qc.opposition_id=v_celador_opposition_id and qc.topic_id=v_requested_topic_id and qc.role='primary' and q.activa;
  select count(*) into v_study_units from public.study_units u
  where u.opposition_id=v_celador_opposition_id and u.topic_id=v_requested_topic_id and u.active;
  select count(*) into v_concepts from public.concepts c
  where c.opposition_id=v_celador_opposition_id and c.topic_id=v_requested_topic_id and c.active;
  select count(*) into v_flashcards
  from public.flashcards f join public.concepts c on c.id=f.concept_id and c.opposition_id=f.opposition_id
  where f.opposition_id=v_celador_opposition_id and c.topic_id=v_requested_topic_id and f.active and c.active;
  if row(v_active_questions,v_primary_mappings,v_study_units,v_concepts,v_flashcards)
     is distinct from row(v_expected_active,v_expected_primary,v_expected_units,v_expected_concepts,v_expected_flashcards) then
    raise exception 'ELI-44 structural preflight mismatch: questions %, PRIMARY %, units %, concepts %, flashcards %',
      v_active_questions,v_primary_mappings,v_study_units,v_concepts,v_flashcards using errcode='P0001';
  end if;

  select
    count(*) filter (where final_level='aprendizaje'),
    count(*) filter (where final_level='consolidacion'),
    count(*) filter (where final_level='tribunal'),
    count(*) filter (where final_answer='A'),
    count(*) filter (where final_answer='B'),
    count(*) filter (where final_answer='C'),
    count(*) filter (where final_answer='D')
  into v_level_aprendizaje,v_level_consolidacion,v_level_tribunal,v_answer_a,v_answer_b,v_answer_c,v_answer_d
  from (
    select coalesce(m.nivel_pedagogico,q.nivel_pedagogico) final_level,
           coalesce(m.respuesta_correcta,q.respuesta_correcta::text) final_answer
    from public.questions q
    left join pg_temp.eli44_mutations m on m.question_id=q.id and m.codigo=q.codigo
    where q.opposition_id=v_celador_opposition_id and q.topic_id=v_requested_topic_id and q.activa
  ) projected;
  if row(v_level_aprendizaje,v_level_consolidacion,v_level_tribunal,v_answer_a,v_answer_b,v_answer_c,v_answer_d)
     is distinct from row(v_expected_aprendizaje,v_expected_consolidacion,v_expected_tribunal,v_expected_a,v_expected_b,v_expected_c,v_expected_d) then
    raise exception 'ELI-44 projected hardening distribution mismatch' using errcode='P0001';
  end if;

  -- Cross-opposition/T04/T05-T08/T13 contamination protection is structural: the only DML below
  -- is an id+code+opposition+topic scoped UPDATE, and before/after hashes verify all preserved surfaces.
  select count(*) filter (where activa) into v_aux_active_before
  from public.questions where opposition_id='00000000-0000-4000-8000-000000000001'::uuid;
  select count(*) filter (where activa) into v_celador_outside_before
  from public.questions where opposition_id=v_celador_opposition_id and topic_id<>v_requested_topic_id;

  select encode(digest(coalesce(string_agg(
    (to_jsonb(q) - array['pregunta','opcion_a','opcion_b','opcion_c','opcion_d','respuesta_correcta','explicacion','nivel_pedagogico','tipo_trampa']::text[])::text,
    '|' order by q.id::text),''),'sha256'),'hex')
  into v_questions_preserved_before
  from public.questions q where q.opposition_id=v_celador_opposition_id and q.topic_id=v_requested_topic_id;

  select encode(digest(coalesce(string_agg(to_jsonb(qc)::text,'|' order by qc.question_id::text,qc.concept_id::text,qc.role),''),'sha256'),'hex')
  into v_qc_before from public.question_concepts qc where qc.opposition_id=v_celador_opposition_id and qc.topic_id=v_requested_topic_id;
  select encode(digest(coalesce(string_agg(to_jsonb(u)::text,'|' order by u.id::text),''),'sha256'),'hex')
  into v_units_before from public.study_units u where u.opposition_id=v_celador_opposition_id and u.topic_id=v_requested_topic_id;
  select encode(digest(coalesce(string_agg(to_jsonb(c)::text,'|' order by c.id::text),''),'sha256'),'hex')
  into v_concepts_before from public.concepts c where c.opposition_id=v_celador_opposition_id and c.topic_id=v_requested_topic_id;
  select encode(digest(coalesce(string_agg(to_jsonb(f)::text,'|' order by f.id::text),''),'sha256'),'hex')
  into v_flashcards_before
  from public.flashcards f join public.concepts c on c.id=f.concept_id and c.opposition_id=f.opposition_id
  where f.opposition_id=v_celador_opposition_id and c.topic_id=v_requested_topic_id;

  if v_mode = 'preflight' then
    return jsonb_build_object(
      'result','PASS','package_id',v_package_id,'mode','preflight','academic_writes',0,
      'package_fingerprint',v_package_fingerprint,
      'active_questions',v_active_questions,'mutations',v_rows,'keeps',v_keep_count,'edits',v_edit_count,'replaces',v_replace_count,
      'current_fingerprints_match',v_rows + v_keep_count,
      'projected_levels',jsonb_build_object('aprendizaje',v_level_aprendizaje,'consolidacion',v_level_consolidacion,'tribunal',v_level_tribunal),
      'projected_answers',jsonb_build_object('A',v_answer_a,'B',v_answer_b,'C',v_answer_c,'D',v_answer_d),
      'primary_mappings',v_primary_mappings,'study_units',v_study_units,'concepts',v_concepts,'flashcards',v_flashcards,
      'auxiliar_active',v_aux_active_before,'celador_outside_topic_active',v_celador_outside_before
    );
  end if;

  -- EXECUTE re-checks every current fingerprint under row locks to close the preflight/write race.
  for v_bad_code, v_current_fp in
    select p.codigo,
      encode(digest(array_to_json(array[
        q.id::text,q.codigo,q.pregunta,q.opcion_a,q.opcion_b,q.opcion_c,q.opcion_d,q.respuesta_correcta::text,
        q.explicacion,q.nivel_pedagogico,q.tipo_trampa
      ]::text[])::text,'sha256'),'hex')
    from (
      select question_id,codigo,expected_current_fingerprint from pg_temp.eli44_mutations
      union all
      select question_id,codigo,expected_current_fingerprint from pg_temp.eli44_keeps
    ) p
    join public.questions q on q.id=p.question_id
    where encode(digest(array_to_json(array[
        q.id::text,q.codigo,q.pregunta,q.opcion_a,q.opcion_b,q.opcion_c,q.opcion_d,q.respuesta_correcta::text,
        q.explicacion,q.nivel_pedagogico,q.tipo_trampa
      ]::text[])::text,'sha256'),'hex') is distinct from p.expected_current_fingerprint
    for update of q
    limit 1
  loop
    raise exception 'STALE_PACKAGE: locked current fingerprint mismatch for %', v_bad_code using errcode='P0001';
  end loop;

  update public.questions q set
      pregunta = m.pregunta,
      opcion_a = m.opcion_a,
      opcion_b = m.opcion_b,
      opcion_c = m.opcion_c,
      opcion_d = m.opcion_d,
      respuesta_correcta = m.respuesta_correcta::public.respuesta_enum,
      explicacion = m.explicacion,
      nivel_pedagogico = m.nivel_pedagogico,
      tipo_trampa = m.tipo_trampa
  from pg_temp.eli44_mutations m
  where q.id=m.question_id and q.codigo=m.codigo
    and q.opposition_id=v_celador_opposition_id and q.topic_id=v_requested_topic_id and q.activa;
  get diagnostics v_rows = row_count;
  if v_rows <> v_expected_mutations then
    raise exception 'ELI-44 execute affected % rows instead of %',v_rows,v_expected_mutations using errcode='P0001';
  end if;

  select count(*) filter (where q.activa),
         count(*) filter (where q.activa and q.nivel_pedagogico='aprendizaje'),
         count(*) filter (where q.activa and q.nivel_pedagogico='consolidacion'),
         count(*) filter (where q.activa and q.nivel_pedagogico='tribunal'),
         count(*) filter (where q.activa and q.respuesta_correcta='A'),
         count(*) filter (where q.activa and q.respuesta_correcta='B'),
         count(*) filter (where q.activa and q.respuesta_correcta='C'),
         count(*) filter (where q.activa and q.respuesta_correcta='D')
  into v_active_questions,v_level_aprendizaje,v_level_consolidacion,v_level_tribunal,v_answer_a,v_answer_b,v_answer_c,v_answer_d
  from public.questions q where q.opposition_id=v_celador_opposition_id and q.topic_id=v_requested_topic_id;
  if row(v_active_questions,v_level_aprendizaje,v_level_consolidacion,v_level_tribunal,v_answer_a,v_answer_b,v_answer_c,v_answer_d)
     is distinct from row(v_expected_active,v_expected_aprendizaje,v_expected_consolidacion,v_expected_tribunal,v_expected_a,v_expected_b,v_expected_c,v_expected_d) then
    raise exception 'ELI-44 execute postcondition count/distribution mismatch' using errcode='P0001';
  end if;

  if exists (
    select 1 from pg_temp.eli44_mutations m join public.questions q on q.id=m.question_id and q.codigo=m.codigo
    where q.pregunta is distinct from m.pregunta or q.opcion_a is distinct from m.opcion_a or q.opcion_b is distinct from m.opcion_b
       or q.opcion_c is distinct from m.opcion_c or q.opcion_d is distinct from m.opcion_d
       or q.respuesta_correcta::text is distinct from m.respuesta_correcta or q.explicacion is distinct from m.explicacion
       or q.nivel_pedagogico is distinct from m.nivel_pedagogico or q.tipo_trampa is distinct from m.tipo_trampa
  ) then
    raise exception 'ELI-44 execute postcondition target mismatch' using errcode='P0001';
  end if;
  if exists (
    select 1 from pg_temp.eli44_keeps k join public.questions q on q.id=k.question_id and q.codigo=k.codigo
    where encode(digest(array_to_json(array[
      q.id::text,q.codigo,q.pregunta,q.opcion_a,q.opcion_b,q.opcion_c,q.opcion_d,q.respuesta_correcta::text,
      q.explicacion,q.nivel_pedagogico,q.tipo_trampa
    ]::text[])::text,'sha256'),'hex') is distinct from k.expected_current_fingerprint
  ) then
    raise exception 'ELI-44 KEEP row changed during execute' using errcode='P0001';
  end if;

  select encode(digest(coalesce(string_agg(
    (to_jsonb(q) - array['pregunta','opcion_a','opcion_b','opcion_c','opcion_d','respuesta_correcta','explicacion','nivel_pedagogico','tipo_trampa']::text[])::text,
    '|' order by q.id::text),''),'sha256'),'hex')
  into v_questions_preserved_after
  from public.questions q where q.opposition_id=v_celador_opposition_id and q.topic_id=v_requested_topic_id;
  select encode(digest(coalesce(string_agg(to_jsonb(qc)::text,'|' order by qc.question_id::text,qc.concept_id::text,qc.role),''),'sha256'),'hex')
  into v_qc_after from public.question_concepts qc where qc.opposition_id=v_celador_opposition_id and qc.topic_id=v_requested_topic_id;
  select encode(digest(coalesce(string_agg(to_jsonb(u)::text,'|' order by u.id::text),''),'sha256'),'hex')
  into v_units_after from public.study_units u where u.opposition_id=v_celador_opposition_id and u.topic_id=v_requested_topic_id;
  select encode(digest(coalesce(string_agg(to_jsonb(c)::text,'|' order by c.id::text),''),'sha256'),'hex')
  into v_concepts_after from public.concepts c where c.opposition_id=v_celador_opposition_id and c.topic_id=v_requested_topic_id;
  select encode(digest(coalesce(string_agg(to_jsonb(f)::text,'|' order by f.id::text),''),'sha256'),'hex')
  into v_flashcards_after
  from public.flashcards f join public.concepts c on c.id=f.concept_id and c.opposition_id=f.opposition_id
  where f.opposition_id=v_celador_opposition_id and c.topic_id=v_requested_topic_id;

  if v_questions_preserved_after is distinct from v_questions_preserved_before
     or v_qc_after is distinct from v_qc_before or v_units_after is distinct from v_units_before
     or v_concepts_after is distinct from v_concepts_before or v_flashcards_after is distinct from v_flashcards_before then
    raise exception 'ELI-44 execute preservation hash mismatch; rolling back' using errcode='P0001';
  end if;

  select count(*) into v_primary_mappings
  from public.question_concepts qc join public.questions q on q.id=qc.question_id
  where qc.opposition_id=v_celador_opposition_id and qc.topic_id=v_requested_topic_id and qc.role='primary' and q.activa;
  select count(*) into v_study_units from public.study_units u where u.opposition_id=v_celador_opposition_id and u.topic_id=v_requested_topic_id and u.active;
  select count(*) into v_concepts from public.concepts c where c.opposition_id=v_celador_opposition_id and c.topic_id=v_requested_topic_id and c.active;
  select count(*) into v_flashcards from public.flashcards f join public.concepts c on c.id=f.concept_id and c.opposition_id=f.opposition_id
  where f.opposition_id=v_celador_opposition_id and c.topic_id=v_requested_topic_id and f.active and c.active;
  if row(v_primary_mappings,v_study_units,v_concepts,v_flashcards) is distinct from row(v_expected_primary,v_expected_units,v_expected_concepts,v_expected_flashcards) then
    raise exception 'ELI-44 execute preservation count mismatch' using errcode='P0001';
  end if;

  select count(*) filter (where activa) into v_aux_active_after from public.questions where opposition_id='00000000-0000-4000-8000-000000000001'::uuid;
  select count(*) filter (where activa) into v_celador_outside_after from public.questions where opposition_id=v_celador_opposition_id and topic_id<>v_requested_topic_id;
  if v_aux_active_after is distinct from v_aux_active_before or v_celador_outside_after is distinct from v_celador_outside_before then
    raise exception 'ELI-44 execute cross-scope contamination detected' using errcode='P0001';
  end if;

  return jsonb_build_object(
    'result','PASS','package_id',v_package_id,'mode','execute','academic_writes',v_rows,
    'package_fingerprint',v_package_fingerprint,'active_questions',v_active_questions,'mutated_questions',v_rows,'keeps',v_keep_count,
    'levels',jsonb_build_object('aprendizaje',v_level_aprendizaje,'consolidacion',v_level_consolidacion,'tribunal',v_level_tribunal),
    'answers',jsonb_build_object('A',v_answer_a,'B',v_answer_b,'C',v_answer_c,'D',v_answer_d),
    'primary_mappings',v_primary_mappings,'study_units',v_study_units,'concepts',v_concepts,'flashcards',v_flashcards,
    'preservation','PASS','contamination','PASS'
  );
end;
$function$;

revoke all on function public.execute_celador_question_hardening(jsonb) from public, anon, service_role;
grant execute on function public.execute_celador_question_hardening(jsonb) to authenticated;

comment on function public.execute_celador_question_hardening(jsonb) is
'ELI-44 narrow authenticated Celador existing-question hardening executor. SECURITY INVOKER; no generic SQL; package + topic + identities + fingerprints are locked before write.';
