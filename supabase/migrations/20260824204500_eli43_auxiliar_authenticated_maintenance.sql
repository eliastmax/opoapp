-- ELI-43 · Authenticated Auxiliar maintenance executor.
-- Infrastructure only. This migration does not execute ELI-42 or mutate academic corpus rows.
-- The single exposed RPC is SECURITY INVOKER and accepts only two hard-coded packages:
--   1) eli43_harmless_probe_v1 (read-only proof)
--   2) eli42_t11_oos_cleanup_v1 (preflight or explicit execute)

create or replace function public.execute_auxiliar_maintenance(p_package jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_user_id uuid := (select auth.uid());
  v_active_opposition_id uuid := public.current_active_opposition_id();
  v_auxiliar_opposition_id constant uuid := '00000000-0000-4000-8000-000000000001'::uuid;
  v_t11_topic_id constant uuid := '2200545d-5c23-480b-a994-440c08c843b2'::uuid;
  v_package_id text;
  v_mode text;
  v_requested_opposition_id uuid;
  v_requested_topic_id uuid;
  v_confirmation text;
  v_unknown_keys text[];
  v_t11_active integer;
  v_oos_active integer;
  v_inscope_active integer;
  v_oos_primary integer;
  v_inscope_primary integer;
  v_affected integer;
  v_level_aprendizaje integer;
  v_level_consolidacion integer;
  v_level_tribunal integer;
  v_answer_a integer;
  v_answer_b integer;
  v_answer_c integer;
  v_answer_d integer;
begin
  if p_package is null or jsonb_typeof(p_package) <> 'object' then
    raise exception 'ELI-43 package must be a JSON object' using errcode = '22023';
  end if;

  select array_agg(key order by key)
  into v_unknown_keys
  from jsonb_object_keys(p_package) as keys(key)
  where key not in ('package_id','mode','opposition_id','topic_id','confirmation');

  if coalesce(cardinality(v_unknown_keys), 0) > 0 then
    raise exception 'ELI-43 package contains unsupported keys: %', array_to_string(v_unknown_keys, ', ')
      using errcode = '22023';
  end if;

  v_package_id := nullif(p_package ->> 'package_id', '');
  v_mode := nullif(p_package ->> 'mode', '');
  v_confirmation := nullif(p_package ->> 'confirmation', '');

  begin
    v_requested_opposition_id := nullif(p_package ->> 'opposition_id', '')::uuid;
    v_requested_topic_id := nullif(p_package ->> 'topic_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'ELI-43 package contains an invalid UUID' using errcode = '22023';
  end;

  if v_package_id is null or v_package_id not in ('eli43_harmless_probe_v1','eli42_t11_oos_cleanup_v1') then
    raise exception 'ELI-43 package is not allowlisted' using errcode = '22023';
  end if;

  if current_user <> 'authenticated' then
    raise exception 'ELI-43 requires the authenticated database role' using errcode = '42501';
  end if;

  if v_user_id is null then
    raise exception 'ELI-43 requires a real authenticated user session' using errcode = '42501';
  end if;

  if v_requested_opposition_id is distinct from v_auxiliar_opposition_id then
    raise exception 'ELI-43 is restricted to Auxiliar Administrativo SMS' using errcode = '42501';
  end if;

  if v_active_opposition_id is distinct from v_auxiliar_opposition_id then
    raise exception 'ELI-43 requires Auxiliar as the active opposition' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.opposition_admins administrator
    where administrator.user_id = v_user_id
      and administrator.opposition_id = v_auxiliar_opposition_id
  ) then
    raise exception 'ELI-43 requires opposition_admin for Auxiliar' using errcode = '42501';
  end if;

  if v_package_id = 'eli43_harmless_probe_v1' then
    if v_mode is distinct from 'probe' then
      raise exception 'ELI-43 harmless probe only supports mode=probe' using errcode = '22023';
    end if;
    if v_requested_topic_id is not null or v_confirmation is not null then
      raise exception 'ELI-43 harmless probe does not accept topic_id or confirmation' using errcode = '22023';
    end if;

    select count(*) filter (where q.activa),
           count(*) filter (where q.activa and q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200'),
           count(*) filter (where q.activa and q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180')
    into v_t11_active, v_oos_active, v_inscope_active
    from public.questions q
    where q.opposition_id = v_auxiliar_opposition_id
      and q.topic_id = v_t11_topic_id;

    return jsonb_build_object(
      'result','PASS',
      'package_id',v_package_id,
      'mode','probe',
      'authenticated',true,
      'auxiliar_admin',true,
      'active_opposition_id',v_auxiliar_opposition_id,
      'academic_writes',0,
      't11_active',v_t11_active,
      't11_oos_active',v_oos_active,
      't11_inscope_active',v_inscope_active
    );
  end if;

  if v_requested_topic_id is distinct from v_t11_topic_id then
    raise exception 'ELI-42 package is restricted to Auxiliar T11' using errcode = '42501';
  end if;

  if v_mode not in ('preflight','execute') then
    raise exception 'ELI-42 package mode must be preflight or execute' using errcode = '22023';
  end if;

  if v_mode = 'preflight' and v_confirmation is not null then
    raise exception 'ELI-42 preflight does not accept confirmation' using errcode = '22023';
  end if;

  if v_mode = 'execute' and v_confirmation is distinct from 'ELI42_T11_OOS_CLEANUP_V1' then
    raise exception 'ELI-42 execute requires the exact confirmation phrase' using errcode = '42501';
  end if;

  -- Exact preflight inherited from ELI-42. No academic re-audit occurs here.
  select count(*) filter (where q.activa),
         count(*) filter (where q.activa and q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200'),
         count(*) filter (where q.activa and q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180')
  into v_t11_active, v_oos_active, v_inscope_active
  from public.questions q
  where q.opposition_id = v_auxiliar_opposition_id
    and q.topic_id = v_t11_topic_id;

  select count(*) filter (where q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200'),
         count(*) filter (where q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180')
  into v_oos_primary, v_inscope_primary
  from public.question_concepts qc
  join public.questions q on q.id = qc.question_id
  where qc.opposition_id = v_auxiliar_opposition_id
    and qc.topic_id = v_t11_topic_id
    and qc.role = 'primary';

  if v_t11_active <> 200 or v_oos_active <> 20 or v_inscope_active <> 180
     or v_oos_primary <> 20 or v_inscope_primary <> 180 then
    raise exception 'ELI-42 preflight mismatch: active %, OOS %, in-scope %, OOS PRIMARY %, in-scope PRIMARY %',
      v_t11_active, v_oos_active, v_inscope_active, v_oos_primary, v_inscope_primary
      using errcode = 'P0001';
  end if;

  if (select count(*) from public.questions q
      where q.opposition_id=v_auxiliar_opposition_id and q.topic_id=v_t11_topic_id
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
        ) and q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200' and q.activa) <> 20 then
    raise exception 'ELI-42 exact OOS UUID/code ledger mismatch' using errcode = 'P0001';
  end if;

  if (select count(*) from public.concepts c
      where c.opposition_id=v_auxiliar_opposition_id and c.topic_id=v_t11_topic_id
        and c.id in ('a02fe9d6-ae2e-4d39-81dc-e9f0b184684a','09a9657b-deae-494e-b20b-afc41cacf465','266a6155-47bf-41a6-80d0-ffe6e35371c4','539c8201-46db-4cfb-a99e-7c11e5566199')
        and c.active) <> 4 then
    raise exception 'ELI-42 concept preflight mismatch' using errcode = 'P0001';
  end if;

  if (select count(*) from public.study_units u
      where u.opposition_id=v_auxiliar_opposition_id and u.topic_id=v_t11_topic_id
        and u.id in ('1bc629b5-f401-4da3-955f-fb2c0514dfb3','914e2b70-c9d7-411e-918c-71995966565b','995dd50f-ead1-4356-9b91-00e52569e453')
        and u.active) <> 3 then
    raise exception 'ELI-42 study-unit preflight mismatch' using errcode = 'P0001';
  end if;

  if (select count(*) from public.flashcards f
      where f.opposition_id=v_auxiliar_opposition_id
        and f.id in (
          'b65f7b80-fb11-4270-8bc8-585f9302ea11','ae277974-9601-4810-bb16-964b7b17d49f',
          '640d8b8b-54db-47eb-996a-ec7c02c338ea','58af2b07-6fb9-46b0-a5f5-fc8e1e013900',
          'a33791dd-5556-4b19-9001-16d890d2fe60','d6f6a15c-6dcb-472f-9352-216a75a7abfc',
          'e8b9e6fe-7a8e-42f3-b30b-da4ed2199ce0','07a6e9a1-3138-4825-8c74-fc4b365dd393'
        ) and f.active) <> 8 then
    raise exception 'ELI-42 flashcard preflight mismatch' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.question_concepts qc
    join public.questions q on q.id=qc.question_id
    where qc.opposition_id=v_auxiliar_opposition_id
      and qc.topic_id=v_t11_topic_id
      and qc.role='primary'
      and qc.concept_id in ('09a9657b-deae-494e-b20b-afc41cacf465','266a6155-47bf-41a6-80d0-ffe6e35371c4','539c8201-46db-4cfb-a99e-7c11e5566199')
      and q.activa
      and q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180'
  ) then
    raise exception 'ELI-42 C14/C15/C18 gained in-scope PRIMARY content' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.concepts c
    join public.question_concepts qc on qc.concept_id=c.id and qc.opposition_id=c.opposition_id and qc.topic_id=c.topic_id and qc.role='primary'
    join public.questions q on q.id=qc.question_id and q.activa
    where c.opposition_id=v_auxiliar_opposition_id
      and c.topic_id=v_t11_topic_id
      and c.study_unit_id='995dd50f-ead1-4356-9b91-00e52569e453'::uuid
      and q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180'
  ) then
    raise exception 'ELI-42 U07 gained in-scope PRIMARY content' using errcode = 'P0001';
  end if;

  if v_mode = 'preflight' then
    return jsonb_build_object(
      'result','PASS',
      'package_id',v_package_id,
      'mode','preflight',
      'academic_writes',0,
      't11_active',v_t11_active,
      'oos_active',v_oos_active,
      'inscope_active',v_inscope_active,
      'oos_primary',v_oos_primary,
      'inscope_primary',v_inscope_primary,
      'planned_question_retirements',20,
      'planned_primary_deletions',20,
      'planned_concept_updates',4,
      'planned_unit_updates',3,
      'planned_flashcard_deactivations',8
    );
  end if;

  -- ELI-42 execution path. This branch is intentionally NOT invoked by ELI-43.
  delete from public.question_concepts qc
  where qc.opposition_id=v_auxiliar_opposition_id
    and qc.topic_id=v_t11_topic_id
    and qc.role='primary'
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
      '0d337d14-98c3-46e7-a3d2-a24fee65b8e6','1b9986ba-6ad5-42bb-8ca4-36b25fd95753'
    );
  get diagnostics v_affected = row_count;
  if v_affected <> 20 then
    raise exception 'ELI-42 expected 20 PRIMARY deletions, got %', v_affected using errcode='P0001';
  end if;

  update public.questions q
  set activa=false
  where q.opposition_id=v_auxiliar_opposition_id
    and q.topic_id=v_t11_topic_id
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
    )
    and q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200'
    and q.activa;
  get diagnostics v_affected = row_count;
  if v_affected <> 20 then
    raise exception 'ELI-42 expected 20 question retirements, got %', v_affected using errcode='P0001';
  end if;

  update public.concepts
  set title='Derechos asistenciales básicos',
      description='Artículo 11: catálogo básico asistencial.',
      updated_at=now()
  where opposition_id=v_auxiliar_opposition_id and topic_id=v_t11_topic_id
    and id='a02fe9d6-ae2e-4d39-81dc-e9f0b184684a'::uuid and active;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'ELI-42 expected C01 update' using errcode='P0001'; end if;

  update public.concepts
  set active=false, updated_at=now()
  where opposition_id=v_auxiliar_opposition_id and topic_id=v_t11_topic_id and active
    and id in ('09a9657b-deae-494e-b20b-afc41cacf465','266a6155-47bf-41a6-80d0-ffe6e35371c4','539c8201-46db-4cfb-a99e-7c11e5566199');
  get diagnostics v_affected = row_count;
  if v_affected <> 3 then raise exception 'ELI-42 expected 3 concept deactivations, got %',v_affected using errcode='P0001'; end if;

  update public.study_units
  set title='Asistencia sanitaria',
      study_summary='La Ley reconoce derechos básicos asistenciales, libre elección, garantía de demora y segunda opinión. El núcleo mínimo del artículo 11.2 no coincide con todo el catálogo del artículo 11.1.',
      exam_keys='["Catálogo asistencial y núcleo mínimo del artículo 11","Elección, demora y segunda opinión"]'::jsonb,
      traps='["Confundir libre elección en primaria con elección irrestricta en cualquier centro"]'::jsonb,
      mnemonics='[]'::jsonb,
      source_refs='[{"pages":"208-211","document":"Temario_new.pdf"}]'::jsonb,
      updated_at=now()
  where opposition_id=v_auxiliar_opposition_id and topic_id=v_t11_topic_id
    and id='1bc629b5-f401-4da3-955f-fb2c0514dfb3'::uuid and active;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'ELI-42 expected U01 update' using errcode='P0001'; end if;

  update public.study_units
  set title='Participación',
      study_summary='Los artículos 38 a 40 regulan participación social e individual, sugerencias, reclamaciones, quejas y agradecimientos.',
      exam_keys='["Participación colectiva e individual","Órganos de participación sanitaria"]'::jsonb,
      confusions='["La opinión y queja también puede ejercerse en el ámbito privado"]'::jsonb,
      traps='[]'::jsonb,
      mnemonics='[]'::jsonb,
      source_refs='[{"pages":"224-225","document":"Temario_new.pdf"}]'::jsonb,
      updated_at=now()
  where opposition_id=v_auxiliar_opposition_id and topic_id=v_t11_topic_id
    and id='914e2b70-c9d7-411e-918c-71995966565b'::uuid and active;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'ELI-42 expected U05 update' using errcode='P0001'; end if;

  update public.study_units
  set active=false, updated_at=now()
  where opposition_id=v_auxiliar_opposition_id and topic_id=v_t11_topic_id
    and id='995dd50f-ead1-4356-9b91-00e52569e453'::uuid and active;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then raise exception 'ELI-42 expected U07 deactivation' using errcode='P0001'; end if;

  update public.flashcards
  set active=false, updated_at=now()
  where opposition_id=v_auxiliar_opposition_id and active
    and id in (
      'b65f7b80-fb11-4270-8bc8-585f9302ea11','ae277974-9601-4810-bb16-964b7b17d49f',
      '640d8b8b-54db-47eb-996a-ec7c02c338ea','58af2b07-6fb9-46b0-a5f5-fc8e1e013900',
      'a33791dd-5556-4b19-9001-16d890d2fe60','d6f6a15c-6dcb-472f-9352-216a75a7abfc',
      'e8b9e6fe-7a8e-42f3-b30b-da4ed2199ce0','07a6e9a1-3138-4825-8c74-fc4b365dd393'
    );
  get diagnostics v_affected = row_count;
  if v_affected <> 8 then raise exception 'ELI-42 expected 8 flashcard deactivations, got %',v_affected using errcode='P0001'; end if;

  -- Exact postconditions. Any failure raises and rolls back the whole RPC call.
  select count(*) filter (where q.activa),
         count(*) filter (where q.activa and q.codigo between 'SMS-T11-0181' and 'SMS-T11-0200')
  into v_t11_active, v_oos_active
  from public.questions q
  where q.opposition_id=v_auxiliar_opposition_id and q.topic_id=v_t11_topic_id;

  select count(*) filter (where q.nivel_pedagogico='aprendizaje'),
         count(*) filter (where q.nivel_pedagogico='consolidacion'),
         count(*) filter (where q.nivel_pedagogico='tribunal'),
         count(*) filter (where q.respuesta_correcta='A'),
         count(*) filter (where q.respuesta_correcta='B'),
         count(*) filter (where q.respuesta_correcta='C'),
         count(*) filter (where q.respuesta_correcta='D')
  into v_level_aprendizaje,v_level_consolidacion,v_level_tribunal,v_answer_a,v_answer_b,v_answer_c,v_answer_d
  from public.questions q
  where q.opposition_id=v_auxiliar_opposition_id and q.topic_id=v_t11_topic_id and q.activa;

  select count(*)
  into v_inscope_primary
  from public.question_concepts qc
  join public.questions q on q.id=qc.question_id
  where qc.opposition_id=v_auxiliar_opposition_id and qc.topic_id=v_t11_topic_id
    and qc.role='primary' and q.activa and q.codigo between 'SMS-T11-0001' and 'SMS-T11-0180';

  if v_t11_active <> 180 or v_oos_active <> 0 or v_inscope_primary <> 180
     or v_level_aprendizaje <> 60 or v_level_consolidacion <> 60 or v_level_tribunal <> 60
     or v_answer_a <> 45 or v_answer_b <> 45 or v_answer_c <> 45 or v_answer_d <> 45 then
    raise exception 'ELI-42 postcondition mismatch; transaction rolled back' using errcode='P0001';
  end if;

  return jsonb_build_object(
    'result','COMMIT',
    'package_id',v_package_id,
    'mode','execute',
    't11_active',v_t11_active,
    'oos_active',v_oos_active,
    'primary_active',v_inscope_primary,
    'levels',jsonb_build_object('aprendizaje',v_level_aprendizaje,'consolidacion',v_level_consolidacion,'tribunal',v_level_tribunal),
    'answers',jsonb_build_object('A',v_answer_a,'B',v_answer_b,'C',v_answer_c,'D',v_answer_d)
  );
exception
  when others then
    -- Never include session, JWT, password or API-key material in errors.
    raise;
end;
$function$;

revoke all on function public.execute_auxiliar_maintenance(jsonb) from public, anon, service_role;
grant execute on function public.execute_auxiliar_maintenance(jsonb) to authenticated;

comment on function public.execute_auxiliar_maintenance(jsonb) is
  'ELI-43 allowlisted Auxiliar operator maintenance RPC. SECURITY INVOKER; real authenticated opposition_admin only; no arbitrary SQL.';
