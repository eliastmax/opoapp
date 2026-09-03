-- ELI-95 · Exact one-time Auxiliar T23 out-of-scope logical cleanup.
--
-- Governance authorizes only activa=true -> false for the exact nine T23 rows
-- SMS-T23-0121..0129. No question content, provenance, mapping, taxonomy,
-- Study, mastery or flashcard data may change.
--
-- This follows the sanctioned ELI-42 internal maintenance pattern: trusted
-- postgres runtime only, hard-coded Auxiliar/topic/ledger, preflight, atomic
-- execute, exact postconditions and no generic SQL surface.

create or replace function public.assign_catalog_opposition()
returns trigger
language plpgsql
set search_path to 'pg_catalog', 'pg_temp'
as $function$
declare
  v_user_id uuid; v_opposition_id uuid; v_topic_id uuid; v_operation text;
  v_actor_user_id uuid; v_locked_subject_id uuid; v_locked_curator_id uuid;
begin
  if current_user='postgres'
     and current_setting('opoapp.aux_hardening.operation',true)
         in ('question_hardening','eli42_scope_cleanup','eli95_t23_oos_cleanup') then
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

    if v_operation='eli42_scope_cleanup' then
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

    -- ELI-95 exact T23 structural-scope cleanup.
    if v_topic_id is distinct from 'a3cb5108-c2d3-44c6-adb6-717588d66a63'::uuid then
      raise exception 'ELI-95 cleanup is restricted to Auxiliar T23' using errcode='42501';
    end if;
    if not (
      (old.codigo='SMS-T23-0121' and old.id='dc5657c6-5605-4398-a810-10190fc00156'::uuid) or
      (old.codigo='SMS-T23-0122' and old.id='2cf10b92-70fa-478e-b065-e05218c2ec87'::uuid) or
      (old.codigo='SMS-T23-0123' and old.id='57bc5a2c-3465-47f3-83eb-8903df580e9b'::uuid) or
      (old.codigo='SMS-T23-0124' and old.id='22dfa515-ced8-46c9-a7e5-7fa612a0a1b6'::uuid) or
      (old.codigo='SMS-T23-0125' and old.id='833994a0-f6ba-41fb-adb1-68c9650f845c'::uuid) or
      (old.codigo='SMS-T23-0126' and old.id='ad99f4dd-8f2e-463d-aacb-22052317e9f4'::uuid) or
      (old.codigo='SMS-T23-0127' and old.id='eb860ac7-a304-43a4-8a12-3e1c4bf949cc'::uuid) or
      (old.codigo='SMS-T23-0128' and old.id='9f9e667a-d05f-4f76-8524-859203743f6d'::uuid) or
      (old.codigo='SMS-T23-0129' and old.id='43ceb09e-51b1-4fcc-9252-763de353dc3d'::uuid)
    ) then
      raise exception 'ELI-95 cleanup question is outside the exact UUID/code ledger' using errcode='42501';
    end if;
    if (to_jsonb(new)-'activa'-'updated_at')
       is distinct from (to_jsonb(old)-'activa'-'updated_at')
       or old.activa is distinct from true
       or new.activa is distinct from false then
      raise exception 'ELI-95 cleanup may only flip activa true to false on the exact OOS ledger' using errcode='42501';
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

create or replace function catalog_maintenance_private.execute_eli95_t23_oos_cleanup(
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
  v_t23 constant uuid := 'a3cb5108-c2d3-44c6-adb6-717588d66a63'::uuid;
  v_total integer; v_active integer; v_active_codes integer; v_inscope_active integer; v_oos_active integer; v_oos_inactive integer;
  v_oos_primary_exact1 integer; v_inscope_primary_exact1 integer; v_affected integer;
  v_level_a integer; v_level_c integer; v_level_t integer;
  v_answer_a integer; v_answer_b integer; v_answer_c integer; v_answer_d integer;
  v_oos_preserve_hash text; v_oos_full_hash text; v_mapping_hash text;
  v_inscope_hash_before text; v_inscope_hash_after text;
  v_other_aux_hash_before text; v_other_aux_hash_after text;
  v_celador_hash_before text; v_celador_hash_after text;
begin
  if current_user <> 'postgres' then
    raise exception 'ELI-95 internal cleanup requires trusted postgres runtime' using errcode='42501';
  end if;
  if p_mode is null or p_mode not in ('preflight','execute') then
    raise exception 'ELI-95 mode must be preflight or execute' using errcode='22023';
  end if;
  if p_mode='preflight' and p_confirmation is not null then
    raise exception 'ELI-95 preflight does not accept confirmation' using errcode='22023';
  end if;
  if p_mode='execute' and p_confirmation is distinct from 'ELI95_T23_OOS_CLEANUP_V1' then
    raise exception 'ELI-95 execute requires exact confirmation' using errcode='42501';
  end if;

  select count(*),count(*) filter(where q.activa),count(distinct q.codigo) filter(where q.activa),
         count(*) filter(where q.activa and q.codigo between 'SMS-T23-0001' and 'SMS-T23-0120'),
         count(*) filter(where q.activa and q.codigo between 'SMS-T23-0121' and 'SMS-T23-0129'),
         count(*) filter(where not q.activa and q.codigo between 'SMS-T23-0121' and 'SMS-T23-0129')
  into v_total,v_active,v_active_codes,v_inscope_active,v_oos_active,v_oos_inactive
  from public.questions q
  where q.opposition_id=v_auxiliar and q.topic_id=v_t23;

  if v_total<>129 or v_active<>129 or v_active_codes<>129
     or v_inscope_active<>120 or v_oos_active<>9 or v_oos_inactive<>0 then
    raise exception 'ELI-95 preflight count mismatch: total %, active %, active codes %, in-scope %, OOS active %, OOS inactive %',
      v_total,v_active,v_active_codes,v_inscope_active,v_oos_active,v_oos_inactive using errcode='P0001';
  end if;

  if exists(
    select 1 from (
      select 'SMS-T23-'||lpad(gs::text,4,'0') as codigo from generate_series(1,129) gs
      except
      select q.codigo from public.questions q where q.opposition_id=v_auxiliar and q.topic_id=v_t23 and q.activa
    ) missing
  ) or exists(
    select 1 from (
      select q.codigo from public.questions q where q.opposition_id=v_auxiliar and q.topic_id=v_t23 and q.activa
      except
      select 'SMS-T23-'||lpad(gs::text,4,'0') from generate_series(1,129) gs
    ) extra
  ) then
    raise exception 'ELI-95 preflight active code-set mismatch' using errcode='P0001';
  end if;

  if (select count(*) from (
    values
      ('SMS-T23-0121','dc5657c6-5605-4398-a810-10190fc00156'::uuid),
      ('SMS-T23-0122','2cf10b92-70fa-478e-b065-e05218c2ec87'::uuid),
      ('SMS-T23-0123','57bc5a2c-3465-47f3-83eb-8903df580e9b'::uuid),
      ('SMS-T23-0124','22dfa515-ced8-46c9-a7e5-7fa612a0a1b6'::uuid),
      ('SMS-T23-0125','833994a0-f6ba-41fb-adb1-68c9650f845c'::uuid),
      ('SMS-T23-0126','ad99f4dd-8f2e-463d-aacb-22052317e9f4'::uuid),
      ('SMS-T23-0127','eb860ac7-a304-43a4-8a12-3e1c4bf949cc'::uuid),
      ('SMS-T23-0128','9f9e667a-d05f-4f76-8524-859203743f6d'::uuid),
      ('SMS-T23-0129','43ceb09e-51b1-4fcc-9252-763de353dc3d'::uuid)
  ) as ledger(codigo,id)
  join public.questions q on q.codigo=ledger.codigo and q.id=ledger.id
  where q.opposition_id=v_auxiliar and q.topic_id=v_t23 and q.activa)<>9 then
    raise exception 'ELI-95 exact OOS UUID/code ledger mismatch' using errcode='P0001';
  end if;

  select md5(string_agg((to_jsonb(q)-'activa'-'updated_at')::text,E'\n' order by q.codigo)),
         md5(string_agg(to_jsonb(q)::text,E'\n' order by q.codigo))
  into v_oos_preserve_hash,v_oos_full_hash
  from public.questions q
  where q.opposition_id=v_auxiliar and q.topic_id=v_t23
    and q.codigo between 'SMS-T23-0121' and 'SMS-T23-0129';

  if v_oos_preserve_hash is distinct from 'b82ef5f14f52bd5db609bf8855eede94'
     or v_oos_full_hash is distinct from 'b2c649aef4b02cfd17445f6bfd946efd' then
    raise exception 'ELI-95 OOS row fingerprint mismatch' using errcode='P0001';
  end if;

  select count(*) into v_oos_primary_exact1
  from (
    select q.id
    from public.questions q
    left join public.question_concepts qc
      on qc.question_id=q.id and qc.opposition_id=v_auxiliar and qc.topic_id=v_t23 and qc.role='primary'
    where q.opposition_id=v_auxiliar and q.topic_id=v_t23
      and q.codigo between 'SMS-T23-0121' and 'SMS-T23-0129'
    group by q.id
    having count(qc.question_id)=1
  ) s;

  select count(*) into v_inscope_primary_exact1
  from (
    select q.id
    from public.questions q
    left join public.question_concepts qc
      on qc.question_id=q.id and qc.opposition_id=v_auxiliar and qc.topic_id=v_t23 and qc.role='primary'
    where q.opposition_id=v_auxiliar and q.topic_id=v_t23 and q.activa
      and q.codigo between 'SMS-T23-0001' and 'SMS-T23-0120'
    group by q.id
    having count(qc.question_id)=1
  ) s;

  select md5(string_agg(to_jsonb(qc)::text,E'\n' order by qc.question_id::text,qc.concept_id::text,qc.role))
  into v_mapping_hash
  from public.question_concepts qc
  join public.questions q on q.id=qc.question_id
  where q.opposition_id=v_auxiliar and q.topic_id=v_t23
    and q.codigo between 'SMS-T23-0121' and 'SMS-T23-0129';

  if v_oos_primary_exact1<>9 or v_inscope_primary_exact1<>120
     or (select count(*) from public.question_concepts qc join public.questions q on q.id=qc.question_id
         where q.opposition_id=v_auxiliar and q.topic_id=v_t23
           and q.codigo between 'SMS-T23-0121' and 'SMS-T23-0129')<>9
     or v_mapping_hash is distinct from 'b7d429992995d7320a7c0b84fc35574b' then
    raise exception 'ELI-95 PRIMARY/mapping preflight mismatch' using errcode='P0001';
  end if;

  select count(*) filter(where q.nivel_pedagogico='aprendizaje'),
         count(*) filter(where q.nivel_pedagogico='consolidacion'),
         count(*) filter(where q.nivel_pedagogico='tribunal'),
         count(*) filter(where q.respuesta_correcta='A'),
         count(*) filter(where q.respuesta_correcta='B'),
         count(*) filter(where q.respuesta_correcta='C'),
         count(*) filter(where q.respuesta_correcta='D')
  into v_level_a,v_level_c,v_level_t,v_answer_a,v_answer_b,v_answer_c,v_answer_d
  from public.questions q
  where q.opposition_id=v_auxiliar and q.topic_id=v_t23 and q.activa;

  if v_level_a<>44 or v_level_c<>43 or v_level_t<>42
     or v_answer_a<>33 or v_answer_b<>32 or v_answer_c<>32 or v_answer_d<>32 then
    raise exception 'ELI-95 preflight distribution mismatch' using errcode='P0001';
  end if;

  select md5(string_agg(jsonb_build_array(id::text,codigo,topic_id::text,activa,pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta::text,coalesce(nivel_pedagogico,''),coalesce(tipo_trampa,''),explicacion)::text,E'\n' order by id))
  into v_inscope_hash_before
  from public.questions
  where opposition_id=v_auxiliar and topic_id=v_t23 and codigo between 'SMS-T23-0001' and 'SMS-T23-0120';
  if v_inscope_hash_before is distinct from '548474ae95bc9dcf15711674e265c59d' then
    raise exception 'ELI-95 in-scope T23 snapshot is stale' using errcode='P0001';
  end if;

  select md5(string_agg(jsonb_build_array(id::text,codigo,topic_id::text,activa,pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta::text,coalesce(nivel_pedagogico,''),coalesce(tipo_trampa,''),explicacion)::text,E'\n' order by id))
  into v_other_aux_hash_before
  from public.questions
  where opposition_id=v_auxiliar and topic_id<>v_t23;

  select md5(string_agg(jsonb_build_array(id::text,codigo,topic_id::text,activa,pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta::text,coalesce(nivel_pedagogico,''),coalesce(tipo_trampa,''),explicacion)::text,E'\n' order by id))
  into v_celador_hash_before
  from public.questions
  where opposition_id='00000000-0000-4000-8000-000000000002'::uuid;

  if p_mode='preflight' then
    return jsonb_build_object(
      'result','PASS','mode','preflight','package_id','eli95_t23_oos_cleanup_v1',
      'executor','internal_governance','academic_writes',0,
      't23_total',v_total,'t23_active',v_active,'inscope_active',v_inscope_active,
      'oos_active',v_oos_active,'oos_inactive',v_oos_inactive,
      'oos_primary_exact1',v_oos_primary_exact1,'inscope_primary_exact1',v_inscope_primary_exact1,
      'oos_preserve_hash',v_oos_preserve_hash,'mapping_hash',v_mapping_hash,
      'inscope_hash',v_inscope_hash_before,'other_aux_hash',v_other_aux_hash_before,'celador_hash',v_celador_hash_before,
      'planned_question_retirements',9,'planned_mapping_changes',0
    );
  end if;

  perform set_config('opoapp.aux_hardening.opposition_id',v_auxiliar::text,true);
  perform set_config('opoapp.aux_hardening.topic_id',v_t23::text,true);
  perform set_config('opoapp.aux_hardening.operation','eli95_t23_oos_cleanup',true);

  update public.questions q
  set activa=false
  from (
    values
      ('SMS-T23-0121','dc5657c6-5605-4398-a810-10190fc00156'::uuid),
      ('SMS-T23-0122','2cf10b92-70fa-478e-b065-e05218c2ec87'::uuid),
      ('SMS-T23-0123','57bc5a2c-3465-47f3-83eb-8903df580e9b'::uuid),
      ('SMS-T23-0124','22dfa515-ced8-46c9-a7e5-7fa612a0a1b6'::uuid),
      ('SMS-T23-0125','833994a0-f6ba-41fb-adb1-68c9650f845c'::uuid),
      ('SMS-T23-0126','ad99f4dd-8f2e-463d-aacb-22052317e9f4'::uuid),
      ('SMS-T23-0127','eb860ac7-a304-43a4-8a12-3e1c4bf949cc'::uuid),
      ('SMS-T23-0128','9f9e667a-d05f-4f76-8524-859203743f6d'::uuid),
      ('SMS-T23-0129','43ceb09e-51b1-4fcc-9252-763de353dc3d'::uuid)
  ) as ledger(codigo,id)
  where q.id=ledger.id and q.codigo=ledger.codigo
    and q.opposition_id=v_auxiliar and q.topic_id=v_t23 and q.activa;
  get diagnostics v_affected=row_count;
  if v_affected<>9 then
    raise exception 'ELI-95 expected 9 question retirements, got %',v_affected using errcode='P0001';
  end if;

  select count(*),count(*) filter(where q.activa),count(distinct q.codigo) filter(where q.activa),
         count(*) filter(where q.activa and q.codigo between 'SMS-T23-0001' and 'SMS-T23-0120'),
         count(*) filter(where q.activa and q.codigo between 'SMS-T23-0121' and 'SMS-T23-0129'),
         count(*) filter(where not q.activa and q.codigo between 'SMS-T23-0121' and 'SMS-T23-0129')
  into v_total,v_active,v_active_codes,v_inscope_active,v_oos_active,v_oos_inactive
  from public.questions q
  where q.opposition_id=v_auxiliar and q.topic_id=v_t23;

  if v_total<>129 or v_active<>120 or v_active_codes<>120
     or v_inscope_active<>120 or v_oos_active<>0 or v_oos_inactive<>9 then
    raise exception 'ELI-95 postcondition count mismatch; transaction rolled back' using errcode='P0001';
  end if;

  if exists(
    select 1 from (
      select 'SMS-T23-'||lpad(gs::text,4,'0') as codigo from generate_series(1,120) gs
      except
      select q.codigo from public.questions q where q.opposition_id=v_auxiliar and q.topic_id=v_t23 and q.activa
    ) missing
  ) or exists(
    select 1 from (
      select q.codigo from public.questions q where q.opposition_id=v_auxiliar and q.topic_id=v_t23 and q.activa
      except
      select 'SMS-T23-'||lpad(gs::text,4,'0') from generate_series(1,120) gs
    ) extra
  ) then
    raise exception 'ELI-95 postcondition active code-set mismatch; transaction rolled back' using errcode='P0001';
  end if;

  select count(*) into v_inscope_primary_exact1
  from (
    select q.id
    from public.questions q
    left join public.question_concepts qc
      on qc.question_id=q.id and qc.opposition_id=v_auxiliar and qc.topic_id=v_t23 and qc.role='primary'
    where q.opposition_id=v_auxiliar and q.topic_id=v_t23 and q.activa
      and q.codigo between 'SMS-T23-0001' and 'SMS-T23-0120'
    group by q.id
    having count(qc.question_id)=1
  ) s;

  select md5(string_agg((to_jsonb(q)-'activa'-'updated_at')::text,E'\n' order by q.codigo))
  into v_oos_preserve_hash
  from public.questions q
  where q.opposition_id=v_auxiliar and q.topic_id=v_t23
    and q.codigo between 'SMS-T23-0121' and 'SMS-T23-0129';

  select md5(string_agg(to_jsonb(qc)::text,E'\n' order by qc.question_id::text,qc.concept_id::text,qc.role))
  into v_mapping_hash
  from public.question_concepts qc
  join public.questions q on q.id=qc.question_id
  where q.opposition_id=v_auxiliar and q.topic_id=v_t23
    and q.codigo between 'SMS-T23-0121' and 'SMS-T23-0129';

  if v_inscope_primary_exact1<>120
     or v_oos_preserve_hash is distinct from 'b82ef5f14f52bd5db609bf8855eede94'
     or v_mapping_hash is distinct from 'b7d429992995d7320a7c0b84fc35574b' then
    raise exception 'ELI-95 preservation postcondition mismatch; transaction rolled back' using errcode='P0001';
  end if;

  select count(*) filter(where q.nivel_pedagogico='aprendizaje'),
         count(*) filter(where q.nivel_pedagogico='consolidacion'),
         count(*) filter(where q.nivel_pedagogico='tribunal'),
         count(*) filter(where q.respuesta_correcta='A'),
         count(*) filter(where q.respuesta_correcta='B'),
         count(*) filter(where q.respuesta_correcta='C'),
         count(*) filter(where q.respuesta_correcta='D')
  into v_level_a,v_level_c,v_level_t,v_answer_a,v_answer_b,v_answer_c,v_answer_d
  from public.questions q
  where q.opposition_id=v_auxiliar and q.topic_id=v_t23 and q.activa;

  if v_level_a<>40 or v_level_c<>40 or v_level_t<>40
     or v_answer_a<>30 or v_answer_b<>30 or v_answer_c<>30 or v_answer_d<>30 then
    raise exception 'ELI-95 postcondition distribution mismatch; transaction rolled back' using errcode='P0001';
  end if;

  select md5(string_agg(jsonb_build_array(id::text,codigo,topic_id::text,activa,pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta::text,coalesce(nivel_pedagogico,''),coalesce(tipo_trampa,''),explicacion)::text,E'\n' order by id))
  into v_inscope_hash_after
  from public.questions
  where opposition_id=v_auxiliar and topic_id=v_t23 and codigo between 'SMS-T23-0001' and 'SMS-T23-0120';

  select md5(string_agg(jsonb_build_array(id::text,codigo,topic_id::text,activa,pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta::text,coalesce(nivel_pedagogico,''),coalesce(tipo_trampa,''),explicacion)::text,E'\n' order by id))
  into v_other_aux_hash_after
  from public.questions
  where opposition_id=v_auxiliar and topic_id<>v_t23;

  select md5(string_agg(jsonb_build_array(id::text,codigo,topic_id::text,activa,pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta::text,coalesce(nivel_pedagogico,''),coalesce(tipo_trampa,''),explicacion)::text,E'\n' order by id))
  into v_celador_hash_after
  from public.questions
  where opposition_id='00000000-0000-4000-8000-000000000002'::uuid;

  if v_inscope_hash_after is distinct from v_inscope_hash_before
     or v_other_aux_hash_after is distinct from v_other_aux_hash_before
     or v_celador_hash_after is distinct from v_celador_hash_before then
    raise exception 'ELI-95 isolation postcondition mismatch; transaction rolled back' using errcode='P0001';
  end if;

  return jsonb_build_object(
    'result','COMMIT','mode','execute','package_id','eli95_t23_oos_cleanup_v1',
    'executor','internal_governance','question_writes',9,'academic_writes',0,'mapping_writes',0,
    't23_total',v_total,'t23_active',v_active,'oos_active',v_oos_active,'oos_inactive',v_oos_inactive,
    'inscope_primary_exact1',v_inscope_primary_exact1,
    'levels',jsonb_build_object('aprendizaje',v_level_a,'consolidacion',v_level_c,'tribunal',v_level_t),
    'answers',jsonb_build_object('A',v_answer_a,'B',v_answer_b,'C',v_answer_c,'D',v_answer_d),
    'oos_preserve_hash',v_oos_preserve_hash,'mapping_hash',v_mapping_hash,
    'inscope_hash',v_inscope_hash_after,'other_aux_hash',v_other_aux_hash_after,'celador_hash',v_celador_hash_after
  );
end;
$function$;

revoke all on function catalog_maintenance_private.execute_eli95_t23_oos_cleanup(text,text)
  from public, anon, authenticated, service_role;
grant execute on function catalog_maintenance_private.execute_eli95_t23_oos_cleanup(text,text) to postgres;

comment on function catalog_maintenance_private.execute_eli95_t23_oos_cleanup(text,text) is
  'ELI-95 exact one-time Auxiliar T23 OOS logical cleanup. Postgres only; hard-coded 9-row UUID/code ledger; activa true to false only; mappings/content preserved.';