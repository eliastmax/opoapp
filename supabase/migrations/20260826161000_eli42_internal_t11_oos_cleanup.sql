-- ELI-42 · One-time internal governed T11 out-of-scope cleanup.
--
-- This removes the final requirement for a human Supabase Auth login for the
-- already-approved T11 scope correction. It is deliberately narrower than the
-- reusable ELI-45 question-hardening executor: the package is fully hard-coded,
-- callable only by the trusted postgres maintenance runtime, and supports only
-- preflight or the exact ELI-42 cleanup transaction.

-- Preserve the existing authenticated/Celador/ELI-45 trigger behavior while
-- adding one exact internal operation that may only flip active true -> false
-- for Auxiliar T11 questions. No academic question field may change in this mode.
create or replace function public.assign_catalog_opposition()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'pg_temp'
as $function$
declare
  v_user_id uuid; v_opposition_id uuid; v_topic_id uuid; v_operation text;
  v_actor_user_id uuid; v_locked_subject_id uuid; v_locked_curator_id uuid;
begin
  if current_user='postgres' and current_setting('opoapp.aux_hardening.operation',true) in ('question_hardening','eli42_scope_cleanup') then
    v_opposition_id:=nullif(current_setting('opoapp.aux_hardening.opposition_id',true),'')::uuid;
    v_topic_id:=nullif(current_setting('opoapp.aux_hardening.topic_id',true),'')::uuid;
    v_operation:=current_setting('opoapp.aux_hardening.operation',true);

    if v_opposition_id is null or v_topic_id is null or v_operation is null then
      raise exception 'Incomplete Auxiliar maintenance context' using errcode='42501';
    end if;
    if v_opposition_id is distinct from '00000000-0000-4000-8000-000000000001'::uuid then
      raise exception 'Auxiliar maintenance is restricted to Auxiliar SMS' using errcode='42501';
    end if;
    if tg_table_name <> 'questions' or tg_op <> 'UPDATE' then
      raise exception 'Auxiliar maintenance operation denied on %/%',tg_table_name,tg_op using errcode='42501';
    end if;
    if old.opposition_id is distinct from v_opposition_id or old.topic_id is distinct from v_topic_id then
      raise exception 'Auxiliar maintenance row is outside the locked topic' using errcode='42501';
    end if;

    if v_operation='question_hardening' then
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

    -- One-time ELI-42 structural cleanup path.
    if v_topic_id is distinct from '2200545d-5c23-480b-a994-440c08c843b2'::uuid then
      raise exception 'ELI-42 cleanup is restricted to Auxiliar T11' using errcode='42501';
    end if;
    if old.codigo < 'SMS-T11-0181' or old.codigo > 'SMS-T11-0200' then
      raise exception 'ELI-42 cleanup question is outside the exact OOS ledger' using errcode='42501';
    end if;
    if new.id is distinct from old.id
       or new.codigo is distinct from old.codigo
       or new.opposition_id is distinct from old.opposition_id
       or new.subject_id is distinct from old.subject_id
       or new.topic_id is distinct from old.topic_id
       or new.subtopic_id is distinct from old.subtopic_id
       or new.user_id is distinct from old.user_id
       or new.pregunta is distinct from old.pregunta
       or new.opcion_a is distinct from old.opcion_a
       or new.opcion_b is distinct from old.opcion_b
       or new.opcion_c is distinct from old.opcion_c
       or new.opcion_d is distinct from old.opcion_d
       or new.respuesta_correcta is distinct from old.respuesta_correcta
       or new.explicacion is distinct from old.explicacion
       or new.nivel_pedagogico is distinct from old.nivel_pedagogico
       or new.tipo_trampa is distinct from old.tipo_trampa
       or old.activa is distinct from true
       or new.activa is distinct from false then
      raise exception 'ELI-42 cleanup may only retire an exact OOS question' using errcode='42501';
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

create or replace function catalog_maintenance_private.execute_eli42_t11_oos_cleanup(
  p_mode text,
  p_confirmation text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, catalog_maintenance_private, pg_temp
as $function$
declare
  v_auxiliar constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  v_t11 constant uuid := '2200545d-5c23-480b-a994-440c08c843b2'::uuid;
  v_t11_active integer; v_oos_active integer; v_inscope_active integer;
  v_oos_primary integer; v_inscope_primary integer; v_affected integer;
  v_level_a integer; v_level_c integer; v_level_t integer;
  v_answer_a integer; v_answer_b integer; v_answer_c integer; v_answer_d integer;
begin
  if current_user <> 'postgres' then
    raise exception 'ELI-42 internal cleanup requires trusted postgres runtime' using errcode='42501';
  end if;
  if p_mode is null or p_mode not in ('preflight','execute') then
    raise exception 'ELI-42 mode must be preflight or execute' using errcode='22023';
  end if;
  if p_mode='preflight' and p_confirmation is not null then
    raise exception 'ELI-42 preflight does not accept confirmation' using errcode='22023';
  end if;
  if p_mode='execute' and p_confirmation is distinct from 'ELI42_T11_OOS_CLEANUP_V1' then
    raise exception 'ELI-42 execute requires exact confirmation' using errcode='42501';
  end if;

  select count(*) filter (where q.activa),
         count(*) filter (where q.activa and q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200'),
         count(*) filter (where q.activa and q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180')
  into v_t11_active,v_oos_active,v_inscope_active
  from public.questions q
  where q.opposition_id=v_auxiliar and q.topic_id=v_t11;

  select count(*) filter (where q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200'),
         count(*) filter (where q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180')
  into v_oos_primary,v_inscope_primary
  from public.question_concepts qc
  join public.questions q on q.id=qc.question_id
  where qc.opposition_id=v_auxiliar and qc.topic_id=v_t11 and qc.role='primary';

  if v_t11_active<>200 or v_oos_active<>20 or v_inscope_active<>180
     or v_oos_primary<>20 or v_inscope_primary<>180 then
    raise exception 'ELI-42 preflight mismatch: active %, OOS %, in-scope %, OOS PRIMARY %, in-scope PRIMARY %',
      v_t11_active,v_oos_active,v_inscope_active,v_oos_primary,v_inscope_primary using errcode='P0001';
  end if;

  if (select count(*) from public.questions q
      where q.opposition_id=v_auxiliar and q.topic_id=v_t11 and q.activa
        and q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200'
        and q.id in (
          '9ab4f5d3-1787-4ae2-a323-1e584d99f318','3b981c9f-07dc-46a0-b7d7-0b807e788b61',
          '6893f22b-e9f6-4cee-8bf2-84b498264ff9','01f49ade-7c43-4ca5-8d0d-e1bd466378a2',
          '9a5f8da7-af52-442a-9afb-e0069a163fc2','617b5a97-9e3e-435c-b235-983b2e981a7b',
          'ba81ba4a-87b4-4c2f-91fc-b8748ad0d695','2a7cdbdd-5471-4a6d-9a30-63ba182103af',
          '975f6bc4-8a01-4540-879e-70fe38791f5c','b2af41a2-295f-4621-839e-071b6d87e82a',
          '8191cef2-7a08-4092-bb7f-e6316855b169','37621dfe-b7bd-4811-8ed2-5ef96277891e',
          'b33f0d98-bef4-4b7d-97ad-c97b7b969ae9','018727c1-f125-4fff-b55c-9f2fc6d30a4f',
          'b9ecd769-c097-4790-a3bd-00211db9272d','5b209142-5dc7-4103-a61b-37a79cd119ea',
          '144d730e-79b6-4d3c-9045-c022ad535087','26593dd1-84a7-442e-8d01-62a94f62c57e',
          '0d337d14-98c3-46e7-a3d2-a24fee65b8e6','1b9986ba-6ad5-42bb-8ca4-36b25fd95753'
        ))<>20 then
    raise exception 'ELI-42 exact OOS UUID/code ledger mismatch' using errcode='P0001';
  end if;

  if (select count(*) from public.concepts c
      where c.opposition_id=v_auxiliar and c.topic_id=v_t11 and c.active
        and c.id in ('a02fe9d6-ae2e-4d39-81dc-e9f0b184684a','09a9657b-deae-494e-b20b-afc41cacf465','266a6155-47bf-41a6-80d0-ffe6e35371c4','539c8201-46db-4cfb-a99e-7c11e5566199'))<>4 then
    raise exception 'ELI-42 concept preflight mismatch' using errcode='P0001';
  end if;
  if (select count(*) from public.study_units u
      where u.opposition_id=v_auxiliar and u.topic_id=v_t11 and u.active
        and u.id in ('1bc629b5-f401-4da3-955f-fb2c0514dfb3','914e2b70-c9d7-411e-918c-71995966565b','995dd50f-ead1-4356-9b91-00e52569e453'))<>3 then
    raise exception 'ELI-42 study-unit preflight mismatch' using errcode='P0001';
  end if;
  if (select count(*) from public.flashcards f
      where f.opposition_id=v_auxiliar and f.active and f.id in (
        'b65f7b80-fb11-4270-8bc8-585f9302ea11','ae277974-9601-4810-bb16-964b7b17d49f',
        '640d8b8b-54db-47eb-996a-ec7c02c338ea','58af2b07-6fb9-46b0-a5f5-fc8e1e013900',
        'a33791dd-5556-4b19-9001-16d890d2fe60','d6f6a15c-6dcb-472f-9352-216a75a7abfc',
        'e8b9e6fe-7a8e-42f3-b30b-da4ed2199ce0','07a6e9a1-3138-4825-8c74-fc4b365dd393'))<>8 then
    raise exception 'ELI-42 flashcard preflight mismatch' using errcode='P0001';
  end if;

  if exists(
    select 1 from public.question_concepts qc join public.questions q on q.id=qc.question_id
    where qc.opposition_id=v_auxiliar and qc.topic_id=v_t11 and qc.role='primary'
      and qc.concept_id in ('09a9657b-deae-494e-b20b-afc41cacf465','266a6155-47bf-41a6-80d0-ffe6e35371c4','539c8201-46db-4cfb-a99e-7c11e5566199')
      and q.activa and q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180') then
    raise exception 'ELI-42 C14/C15/C18 gained in-scope PRIMARY content' using errcode='P0001';
  end if;
  if exists(
    select 1 from public.concepts c
    join public.question_concepts qc on qc.concept_id=c.id and qc.opposition_id=c.opposition_id and qc.topic_id=c.topic_id and qc.role='primary'
    join public.questions q on q.id=qc.question_id and q.activa
    where c.opposition_id=v_auxiliar and c.topic_id=v_t11
      and c.study_unit_id='995dd50f-ead1-4356-9b91-00e52569e453'::uuid
      and q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180') then
    raise exception 'ELI-42 U07 gained in-scope PRIMARY content' using errcode='P0001';
  end if;

  if p_mode='preflight' then
    return jsonb_build_object(
      'result','PASS','mode','preflight','package_id','eli42_t11_oos_cleanup_v1',
      'executor','internal_governance','academic_writes',0,
      't11_active',v_t11_active,'oos_active',v_oos_active,'inscope_active',v_inscope_active,
      'oos_primary',v_oos_primary,'inscope_primary',v_inscope_primary,
      'planned_question_retirements',20,'planned_primary_deletions',20,
      'planned_concept_updates',4,'planned_unit_updates',3,'planned_flashcard_deactivations',8
    );
  end if;

  perform set_config('opoapp.aux_hardening.opposition_id',v_auxiliar::text,true);
  perform set_config('opoapp.aux_hardening.topic_id',v_t11::text,true);
  perform set_config('opoapp.aux_hardening.operation','eli42_scope_cleanup',true);

  delete from public.question_concepts qc
  where qc.opposition_id=v_auxiliar and qc.topic_id=v_t11 and qc.role='primary'
    and qc.question_id in (
      '9ab4f5d3-1787-4ae2-a323-1e584d99f318','3b981c9f-07dc-46a0-b7d7-0b807e788b61',
      '6893f22b-e9f6-4cee-8bf2-84b498264ff9','01f49ade-7c43-4ca5-8d0d-e1bd466378a2',
      '9a5f8da7-af52-442a-9afb-e0069a163fc2','617b5a97-9e3e-435c-b235-983b2e981a7b',
      'ba81ba4a-87b4-4c2f-91fc-b8748ad0d695','2a7cdbdd-5471-4a6d-9a30-63ba182103af',
      '975f6bc4-8a01-4540-879e-70fe38791f5c','b2af41a2-295f-4621-839e-071b6d87e82a',
      '8191cef2-7a08-4092-bb7f-e6316855b169','37621dfe-b7bd-4811-8ed2-5ef96277891e',
      'b33f0d98-bef4-4b7d-97ad-c97b7b969ae9','018727c1-f125-4fff-b55c-9f2fc6d30a4f',
      'b9ecd769-c097-4790-a3bd-00211db9272d','5b209142-5dc7-4103-a61b-37a79cd119ea',
      '144d730e-79b6-4d3c-9045-c022ad535087','26593dd1-84a7-442e-8d01-62a94f62c57e',
      '0d337d14-98c3-46e7-a3d2-a24fee65b8e6','1b9986ba-6ad5-42bb-8ca4-36b25fd95753');
  get diagnostics v_affected=row_count;
  if v_affected<>20 then raise exception 'ELI-42 expected 20 PRIMARY deletions, got %',v_affected using errcode='P0001'; end if;

  update public.questions q set activa=false
  where q.opposition_id=v_auxiliar and q.topic_id=v_t11 and q.activa
    and q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200'
    and q.id in (
      '9ab4f5d3-1787-4ae2-a323-1e584d99f318','3b981c9f-07dc-46a0-b7d7-0b807e788b61',
      '6893f22b-e9f6-4cee-8bf2-84b498264ff9','01f49ade-7c43-4ca5-8d0d-e1bd466378a2',
      '9a5f8da7-af52-442a-9afb-e0069a163fc2','617b5a97-9e3e-435c-b235-983b2e981a7b',
      'ba81ba4a-87b4-4c2f-91fc-b8748ad0d695','2a7cdbdd-5471-4a6d-9a30-63ba182103af',
      '975f6bc4-8a01-4540-879e-70fe38791f5c','b2af41a2-295f-4621-839e-071b6d87e82a',
      '8191cef2-7a08-4092-bb7f-e6316855b169','37621dfe-b7bd-4811-8ed2-5ef96277891e',
      'b33f0d98-bef4-4b7d-97ad-c97b7b969ae9','018727c1-f125-4fff-b55c-9f2fc6d30a4f',
      'b9ecd769-c097-4790-a3bd-00211db9272d','5b209142-5dc7-4103-a61b-37a79cd119ea',
      '144d730e-79b6-4d3c-9045-c022ad535087','26593dd1-84a7-442e-8d01-62a94f62c57e',
      '0d337d14-98c3-46e7-a3d2-a24fee65b8e6','1b9986ba-6ad5-42bb-8ca4-36b25fd95753');
  get diagnostics v_affected=row_count;
  if v_affected<>20 then raise exception 'ELI-42 expected 20 question retirements, got %',v_affected using errcode='P0001'; end if;

  update public.concepts
  set title='Derechos asistenciales básicos',description='Artículo 11: catálogo básico asistencial.',updated_at=now()
  where opposition_id=v_auxiliar and topic_id=v_t11 and id='a02fe9d6-ae2e-4d39-81dc-e9f0b184684a'::uuid and active;
  get diagnostics v_affected=row_count;
  if v_affected<>1 then raise exception 'ELI-42 expected C01 update' using errcode='P0001'; end if;

  update public.concepts set active=false,updated_at=now()
  where opposition_id=v_auxiliar and topic_id=v_t11 and active
    and id in ('09a9657b-deae-494e-b20b-afc41cacf465','266a6155-47bf-41a6-80d0-ffe6e35371c4','539c8201-46db-4cfb-a99e-7c11e5566199');
  get diagnostics v_affected=row_count;
  if v_affected<>3 then raise exception 'ELI-42 expected 3 concept deactivations, got %',v_affected using errcode='P0001'; end if;

  update public.study_units
  set title='Asistencia sanitaria',
      study_summary='La Ley reconoce derechos básicos asistenciales, libre elección, garantía de demora y segunda opinión. El núcleo mínimo del artículo 11.2 no coincide con todo el catálogo del artículo 11.1.',
      exam_keys='["Catálogo asistencial y núcleo mínimo del artículo 11","Elección, demora y segunda opinión"]'::jsonb,
      traps='["Confundir libre elección en primaria con elección irrestricta en cualquier centro"]'::jsonb,
      mnemonics='[]'::jsonb,source_refs='[{"pages":"208-211","document":"Temario_new.pdf"}]'::jsonb,updated_at=now()
  where opposition_id=v_auxiliar and topic_id=v_t11 and id='1bc629b5-f401-4da3-955f-fb2c0514dfb3'::uuid and active;
  get diagnostics v_affected=row_count;
  if v_affected<>1 then raise exception 'ELI-42 expected U01 update' using errcode='P0001'; end if;

  update public.study_units
  set title='Participación',
      study_summary='Los artículos 38 a 40 regulan participación social e individual, sugerencias, reclamaciones, quejas y agradecimientos.',
      exam_keys='["Participación colectiva e individual","Órganos de participación sanitaria"]'::jsonb,
      confusions='["La opinión y queja también puede ejercerse en el ámbito privado"]'::jsonb,
      traps='[]'::jsonb,mnemonics='[]'::jsonb,source_refs='[{"pages":"224-225","document":"Temario_new.pdf"}]'::jsonb,updated_at=now()
  where opposition_id=v_auxiliar and topic_id=v_t11 and id='914e2b70-c9d7-411e-918c-71995966565b'::uuid and active;
  get diagnostics v_affected=row_count;
  if v_affected<>1 then raise exception 'ELI-42 expected U05 update' using errcode='P0001'; end if;

  update public.study_units set active=false,updated_at=now()
  where opposition_id=v_auxiliar and topic_id=v_t11 and id='995dd50f-ead1-4356-9b91-00e52569e453'::uuid and active;
  get diagnostics v_affected=row_count;
  if v_affected<>1 then raise exception 'ELI-42 expected U07 deactivation' using errcode='P0001'; end if;

  update public.flashcards set active=false,updated_at=now()
  where opposition_id=v_auxiliar and active and id in (
    'b65f7b80-fb11-4270-8bc8-585f9302ea11','ae277974-9601-4810-bb16-964b7b17d49f',
    '640d8b8b-54db-47eb-996a-ec7c02c338ea','58af2b07-6fb9-46b0-a5f5-fc8e1e013900',
    'a33791dd-5556-4b19-9001-16d890d2fe60','d6f6a15c-6dcb-472f-9352-216a75a7abfc',
    'e8b9e6fe-7a8e-42f3-b30b-da4ed2199ce0','07a6e9a1-3138-4825-8c74-fc4b365dd393');
  get diagnostics v_affected=row_count;
  if v_affected<>8 then raise exception 'ELI-42 expected 8 flashcard deactivations, got %',v_affected using errcode='P0001'; end if;

  select count(*) filter(where q.activa),count(*) filter(where q.activa and q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200')
  into v_t11_active,v_oos_active from public.questions q where q.opposition_id=v_auxiliar and q.topic_id=v_t11;
  select count(*) filter(where q.nivel_pedagogico='aprendizaje'),count(*) filter(where q.nivel_pedagogico='consolidacion'),count(*) filter(where q.nivel_pedagogico='tribunal'),
         count(*) filter(where q.respuesta_correcta='A'),count(*) filter(where q.respuesta_correcta='B'),count(*) filter(where q.respuesta_correcta='C'),count(*) filter(where q.respuesta_correcta='D')
  into v_level_a,v_level_c,v_level_t,v_answer_a,v_answer_b,v_answer_c,v_answer_d
  from public.questions q where q.opposition_id=v_auxiliar and q.topic_id=v_t11 and q.activa;
  select count(*) into v_inscope_primary
  from public.question_concepts qc join public.questions q on q.id=qc.question_id
  where qc.opposition_id=v_auxiliar and qc.topic_id=v_t11 and qc.role='primary' and q.activa and q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180';

  if v_t11_active<>180 or v_oos_active<>0 or v_inscope_primary<>180
     or v_level_a<>60 or v_level_c<>60 or v_level_t<>60
     or v_answer_a<>45 or v_answer_b<>45 or v_answer_c<>45 or v_answer_d<>45 then
    raise exception 'ELI-42 postcondition mismatch; transaction rolled back' using errcode='P0001';
  end if;
  if exists(select 1 from public.concepts where opposition_id=v_auxiliar and topic_id=v_t11 and active
            and id in ('09a9657b-deae-494e-b20b-afc41cacf465','266a6155-47bf-41a6-80d0-ffe6e35371c4','539c8201-46db-4cfb-a99e-7c11e5566199')) then
    raise exception 'ELI-42 concept postcondition mismatch' using errcode='P0001';
  end if;
  if exists(select 1 from public.study_units where opposition_id=v_auxiliar and topic_id=v_t11 and active and id='995dd50f-ead1-4356-9b91-00e52569e453'::uuid) then
    raise exception 'ELI-42 U07 postcondition mismatch' using errcode='P0001';
  end if;
  if (select count(*) from public.flashcards where opposition_id=v_auxiliar and active and id in (
    'b65f7b80-fb11-4270-8bc8-585f9302ea11','ae277974-9601-4810-bb16-964b7b17d49f','640d8b8b-54db-47eb-996a-ec7c02c338ea','58af2b07-6fb9-46b0-a5f5-fc8e1e013900',
    'a33791dd-5556-4b19-9001-16d890d2fe60','d6f6a15c-6dcb-472f-9352-216a75a7abfc','e8b9e6fe-7a8e-42f3-b30b-da4ed2199ce0','07a6e9a1-3138-4825-8c74-fc4b365dd393'))<>0 then
    raise exception 'ELI-42 flashcard postcondition mismatch' using errcode='P0001';
  end if;

  return jsonb_build_object(
    'result','COMMIT','mode','execute','package_id','eli42_t11_oos_cleanup_v1','executor','internal_governance',
    't11_active',v_t11_active,'oos_active',v_oos_active,'primary_active',v_inscope_primary,
    'levels',jsonb_build_object('aprendizaje',v_level_a,'consolidacion',v_level_c,'tribunal',v_level_t),
    'answers',jsonb_build_object('A',v_answer_a,'B',v_answer_b,'C',v_answer_c,'D',v_answer_d)
  );
end;
$function$;

revoke all on function catalog_maintenance_private.execute_eli42_t11_oos_cleanup(text,text)
  from public, anon, authenticated, service_role;
grant execute on function catalog_maintenance_private.execute_eli42_t11_oos_cleanup(text,text) to postgres;

comment on function catalog_maintenance_private.execute_eli42_t11_oos_cleanup(text,text) is
  'ELI-42 exact one-time Auxiliar T11 OOS cleanup. Trusted postgres runtime only; hard-coded ledger and atomic pre/post gates.';
