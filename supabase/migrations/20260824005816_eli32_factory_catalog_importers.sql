-- ELI-32 · backend-only Factory importers and shared V4 core.
-- Infrastructure only. No importer is invoked by this migration.

create or replace function public.assign_catalog_opposition()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog,pg_temp
as $function$
declare
  v_user_id uuid; v_opposition_id uuid; v_topic_id uuid; v_operation text;
  v_actor_user_id uuid; v_locked_subject_id uuid; v_locked_curator_id uuid;
begin
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
      ) then
        raise exception 'Factory question subtopic is outside the locked topic' using errcode='42501';
      end if;
      return new;
    end if;
    raise exception 'Factory trigger table not authorized: %',tg_table_name using errcode='42501';
  end if;

  -- Existing authenticated semantics stay intact.
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

create or replace function catalog_import_private.import_questions_core(
  p_actor_user_id uuid,
  p_opposition_id uuid,
  p_topic_id uuid,
  p_payload jsonb,
  p_allowed_replacement_codes text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,pg_temp
as $function$
declare
  v_row jsonb; v_code text; v_subject_id uuid; v_subject_name text; v_topic_number integer;
  v_topic_name text; v_curator_id uuid; v_subject_curator_id uuid; v_subtopic_name text; v_subtopic_id uuid;
  v_existing public.questions%rowtype; v_dif_exam public.dificultad_enum; v_dif_concept public.dificultad_enum;
  v_dif_legacy public.dificultad_enum; v_pi integer; v_pf integer; v_resp text; v_dup text;
  v_changed boolean; v_affected integer; v_inserted integer:=0; v_replaced integer:=0;
  v_enriched integer:=0; v_omitted integer:=0; v_subtopics_created integer:=0;
begin
  if current_user<>'factory_catalog_executor' then
    raise exception 'Questions core requires factory_catalog_executor' using errcode='42501';
  end if;
  if p_actor_user_id is distinct from nullif(current_setting('opoapp.catalog.actor_user_id',true),'')::uuid
     or p_opposition_id is distinct from nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid
     or p_topic_id is distinct from nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid
     or current_setting('opoapp.catalog.operation',true)<>'questions_import' then
    raise exception 'Questions core scope mismatch' using errcode='42501';
  end if;
  if p_opposition_id is distinct from '00000000-0000-4000-8000-000000000002'::uuid then
    raise exception 'Factory v1 is restricted to Celador SMS' using errcode='42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'array' then
    raise exception 'payload must be a JSON array' using errcode='22023';
  end if;

  select t.subject_id,t.numero,t.nombre,t.user_id,s.nombre,s.user_id
  into v_subject_id,v_topic_number,v_topic_name,v_curator_id,v_subject_name,v_subject_curator_id
  from public.topics t
  join public.subjects s on s.id=t.subject_id and s.opposition_id=t.opposition_id
  where t.id=p_topic_id and t.opposition_id=p_opposition_id;
  if v_subject_id is null then raise exception 'Locked topic/subject does not exist' using errcode='23503'; end if;
  if v_curator_id is distinct from v_subject_curator_id then
    raise exception 'Legacy curator mismatch between locked subject and topic' using errcode='23514';
  end if;

  select elem->>'codigo' into v_dup
  from jsonb_array_elements(p_payload) elem
  where nullif(btrim(elem->>'codigo'),'') is not null
  group by elem->>'codigo' having count(*)>1 limit 1;
  if v_dup is not null then raise exception 'Duplicate code in payload: %',v_dup using errcode='22023'; end if;
  if exists(select 1 from unnest(coalesce(p_allowed_replacement_codes,'{}'::text[])) c where nullif(btrim(c),'') is null) then
    raise exception 'allowedReplacementCodes cannot contain blank codes' using errcode='22023';
  end if;
  if cardinality(coalesce(p_allowed_replacement_codes,'{}'::text[])) is distinct from
     (select count(distinct c) from unnest(coalesce(p_allowed_replacement_codes,'{}'::text[])) c) then
    raise exception 'allowedReplacementCodes contains duplicates' using errcode='22023';
  end if;
  if exists(
    select 1 from unnest(coalesce(p_allowed_replacement_codes,'{}'::text[])) c
    where not exists(select 1 from jsonb_array_elements(p_payload) e where e->>'codigo'=c)
       or not exists(select 1 from public.questions q where q.opposition_id=p_opposition_id and q.topic_id=p_topic_id and q.codigo=c)
  ) then
    raise exception 'Every allowed replacement must exist in both payload and locked topic' using errcode='22023';
  end if;

  -- Pass 1: validate the complete batch before any question/subtopic mutation.
  for v_row in select value from jsonb_array_elements(p_payload) loop
    v_code:=nullif(btrim(v_row->>'codigo'),'');
    v_resp:=nullif(btrim(v_row->>'respuesta_correcta'),'');
    if v_code is null or nullif(btrim(v_row->>'pregunta'),'') is null
       or nullif(btrim(v_row->>'opcion_a'),'') is null or nullif(btrim(v_row->>'opcion_b'),'') is null
       or nullif(btrim(v_row->>'opcion_c'),'') is null or nullif(btrim(v_row->>'opcion_d'),'') is null
       or v_resp is null then
      raise exception 'Question row is missing required fields: %',coalesce(v_code,'<unknown>') using errcode='22023';
    end if;
    if v_resp not in ('A','B','C','D') then raise exception 'Invalid respuesta_correcta for %',v_code using errcode='22023'; end if;
    if lower(v_row->>'opcion_a') in (lower(v_row->>'opcion_b'),lower(v_row->>'opcion_c'),lower(v_row->>'opcion_d'))
       or lower(v_row->>'opcion_b') in (lower(v_row->>'opcion_c'),lower(v_row->>'opcion_d'))
       or lower(v_row->>'opcion_c')=lower(v_row->>'opcion_d') then
      raise exception 'Four options must be distinct for %',v_code using errcode='22023';
    end if;
    if v_row ? 'numero_tema' and nullif(btrim(v_row->>'numero_tema'),'') is not null
       and ((v_row->>'numero_tema') !~ '^[0-9]+$' or (v_row->>'numero_tema')::integer<>v_topic_number) then
      raise exception 'numero_tema does not match locked topic for %',v_code using errcode='22023';
    end if;
    if nullif(btrim(v_row->>'materia'),'') is not null and btrim(v_row->>'materia')<>v_subject_name then
      raise exception 'materia does not match locked subject for %',v_code using errcode='22023';
    end if;
    if nullif(btrim(v_row->>'tema'),'') is not null
       and lower(regexp_replace(btrim(v_row->>'tema'),'\s+',' ','g'))<>lower(regexp_replace(btrim(v_topic_name),'\s+',' ','g')) then
      raise exception 'tema does not match locked topic for %',v_code using errcode='22023';
    end if;
    if nullif(btrim(v_row->>'pagina_inicio'),'') is not null and (v_row->>'pagina_inicio') !~ '^-?[0-9]+$' then
      raise exception 'pagina_inicio must be integer for %',v_code using errcode='22023';
    end if;
    if nullif(btrim(v_row->>'pagina_fin'),'') is not null and (v_row->>'pagina_fin') !~ '^-?[0-9]+$' then
      raise exception 'pagina_fin must be integer for %',v_code using errcode='22023';
    end if;
    if nullif(btrim(v_row->>'pagina_inicio'),'') is not null and nullif(btrim(v_row->>'pagina_fin'),'') is not null
       and (v_row->>'pagina_fin')::integer<(v_row->>'pagina_inicio')::integer then
      raise exception 'pagina_fin cannot be less than pagina_inicio for %',v_code using errcode='22023';
    end if;
    if exists(select 1 from public.questions q where q.opposition_id=p_opposition_id and q.codigo=v_code and q.topic_id<>p_topic_id) then
      raise exception 'Code % already exists under another topic in the locked opposition',v_code using errcode='23505';
    end if;
  end loop;

  -- Pass 2: scoped inserts/no-ops/replacements.
  for v_row in select value from jsonb_array_elements(p_payload) loop
    v_code:=btrim(v_row->>'codigo');
    v_subtopic_name:=nullif(btrim(v_row->>'subapartado'),'');
    v_dif_exam:=nullif(v_row->>'dificultad_examen','')::public.dificultad_enum;
    v_dif_concept:=nullif(v_row->>'dificultad_conceptual','')::public.dificultad_enum;
    v_dif_legacy:=coalesce(v_dif_exam,nullif(v_row->>'dificultad','')::public.dificultad_enum);
    if v_dif_legacy is null then raise exception 'Row % missing dificultad',v_code using errcode='22023'; end if;
    v_pi:=nullif(btrim(v_row->>'pagina_inicio'),'')::integer;
    v_pf:=nullif(btrim(v_row->>'pagina_fin'),'')::integer;

    select * into v_existing from public.questions q
    where q.opposition_id=p_opposition_id and q.topic_id=p_topic_id and q.codigo=v_code;
    if found then
      v_changed:=v_existing.pregunta is distinct from (v_row->>'pregunta')
        or v_existing.opcion_a is distinct from (v_row->>'opcion_a')
        or v_existing.opcion_b is distinct from (v_row->>'opcion_b')
        or v_existing.opcion_c is distinct from (v_row->>'opcion_c')
        or v_existing.opcion_d is distinct from (v_row->>'opcion_d')
        or v_existing.respuesta_correcta::text is distinct from (v_row->>'respuesta_correcta')
        or coalesce(v_existing.explicacion,'') is distinct from coalesce(v_row->>'explicacion','');
      if v_changed and not(v_code=any(coalesce(p_allowed_replacement_codes,'{}'::text[]))) then
        raise exception 'Conflict on code %: canonical content differs and replacement is not allowed',v_code using errcode='23505';
      end if;
      update public.questions q set
        pregunta=case when v_changed then v_row->>'pregunta' else q.pregunta end,
        opcion_a=case when v_changed then v_row->>'opcion_a' else q.opcion_a end,
        opcion_b=case when v_changed then v_row->>'opcion_b' else q.opcion_b end,
        opcion_c=case when v_changed then v_row->>'opcion_c' else q.opcion_c end,
        opcion_d=case when v_changed then v_row->>'opcion_d' else q.opcion_d end,
        respuesta_correcta=case when v_changed then (v_row->>'respuesta_correcta')::public.respuesta_enum else q.respuesta_correcta end,
        explicacion=case when v_changed then coalesce(v_row->>'explicacion','') else q.explicacion end,
        concepto=case when nullif(btrim(q.concepto),'') is null then nullif(btrim(v_row->>'concepto'),'') else q.concepto end,
        objetivo_aprendizaje=case when nullif(btrim(q.objetivo_aprendizaje),'') is null then nullif(btrim(v_row->>'objetivo_aprendizaje'),'') else q.objetivo_aprendizaje end,
        apartado=case when nullif(btrim(q.apartado),'') is null then nullif(btrim(v_row->>'apartado'),'') else q.apartado end,
        perspectiva=case when nullif(btrim(q.perspectiva),'') is null then nullif(btrim(v_row->>'perspectiva'),'') else q.perspectiva end,
        nivel_pedagogico=case when nullif(btrim(q.nivel_pedagogico),'') is null then nullif(btrim(v_row->>'nivel_pedagogico'),'') else q.nivel_pedagogico end,
        tipo_trampa=case when nullif(btrim(q.tipo_trampa),'') is null then nullif(btrim(v_row->>'tipo_trampa'),'') else q.tipo_trampa end,
        documento_referencia=case when nullif(btrim(q.documento_referencia),'') is null then nullif(btrim(v_row->>'documento_referencia'),'') else q.documento_referencia end,
        frecuencia_historica=case when nullif(btrim(q.frecuencia_historica),'') is null then nullif(btrim(v_row->>'frecuencia_historica'),'') else q.frecuencia_historica end,
        referencia_fuente=case when nullif(btrim(q.referencia_fuente),'') is null then coalesce(v_row->>'referencia_fuente','') else q.referencia_fuente end,
        dificultad_conceptual=coalesce(q.dificultad_conceptual,v_dif_concept),
        dificultad_examen=coalesce(q.dificultad_examen,v_dif_exam),
        pagina_inicio=coalesce(q.pagina_inicio,v_pi),
        pagina_fin=coalesce(q.pagina_fin,v_pf)
      where q.id=v_existing.id and (
        v_changed
        or (nullif(btrim(q.concepto),'') is null and nullif(btrim(v_row->>'concepto'),'') is not null)
        or (nullif(btrim(q.objetivo_aprendizaje),'') is null and nullif(btrim(v_row->>'objetivo_aprendizaje'),'') is not null)
        or (nullif(btrim(q.apartado),'') is null and nullif(btrim(v_row->>'apartado'),'') is not null)
        or (nullif(btrim(q.perspectiva),'') is null and nullif(btrim(v_row->>'perspectiva'),'') is not null)
        or (nullif(btrim(q.nivel_pedagogico),'') is null and nullif(btrim(v_row->>'nivel_pedagogico'),'') is not null)
        or (nullif(btrim(q.tipo_trampa),'') is null and nullif(btrim(v_row->>'tipo_trampa'),'') is not null)
        or (nullif(btrim(q.documento_referencia),'') is null and nullif(btrim(v_row->>'documento_referencia'),'') is not null)
        or (nullif(btrim(q.frecuencia_historica),'') is null and nullif(btrim(v_row->>'frecuencia_historica'),'') is not null)
        or (nullif(btrim(q.referencia_fuente),'') is null and nullif(btrim(v_row->>'referencia_fuente'),'') is not null)
        or (q.dificultad_conceptual is null and v_dif_concept is not null)
        or (q.dificultad_examen is null and v_dif_exam is not null)
        or (q.pagina_inicio is null and v_pi is not null)
        or (q.pagina_fin is null and v_pf is not null)
      );
      get diagnostics v_affected=row_count;
      if v_changed then v_replaced:=v_replaced+1;
      elsif v_affected>0 then v_enriched:=v_enriched+1;
      else v_omitted:=v_omitted+1;
      end if;
    else
      v_subtopic_id:=null;
      if v_subtopic_name is not null then
        select s.id into v_subtopic_id from public.subtopics s
        where s.opposition_id=p_opposition_id and s.topic_id=p_topic_id and s.user_id=v_curator_id and s.nombre=v_subtopic_name;
        if v_subtopic_id is null then
          insert into public.subtopics(user_id,topic_id,nombre,opposition_id)
          values(v_curator_id,p_topic_id,v_subtopic_name,p_opposition_id)
          returning id into v_subtopic_id;
          v_subtopics_created:=v_subtopics_created+1;
        end if;
      end if;
      insert into public.questions(
        user_id,codigo,subject_id,topic_id,subtopic_id,dificultad,dificultad_conceptual,dificultad_examen,
        concepto,objetivo_aprendizaje,apartado,perspectiva,nivel_pedagogico,tipo_trampa,
        pregunta,opcion_a,opcion_b,opcion_c,opcion_d,respuesta_correcta,explicacion,
        documento_referencia,pagina_inicio,pagina_fin,referencia_fuente,frecuencia_historica,opposition_id
      ) values(
        v_curator_id,v_code,v_subject_id,p_topic_id,v_subtopic_id,v_dif_legacy,v_dif_concept,v_dif_exam,
        nullif(btrim(v_row->>'concepto'),''),nullif(btrim(v_row->>'objetivo_aprendizaje'),''),
        nullif(btrim(v_row->>'apartado'),''),nullif(btrim(v_row->>'perspectiva'),''),
        nullif(btrim(v_row->>'nivel_pedagogico'),''),nullif(btrim(v_row->>'tipo_trampa'),''),
        v_row->>'pregunta',v_row->>'opcion_a',v_row->>'opcion_b',v_row->>'opcion_c',v_row->>'opcion_d',
        (v_row->>'respuesta_correcta')::public.respuesta_enum,coalesce(v_row->>'explicacion',''),
        nullif(btrim(v_row->>'documento_referencia'),''),v_pi,v_pf,coalesce(v_row->>'referencia_fuente',''),
        nullif(btrim(v_row->>'frecuencia_historica'),''),p_opposition_id
      );
      v_inserted:=v_inserted+1;
    end if;
  end loop;
  return jsonb_build_object('inserted',v_inserted,'replaced',v_replaced,'enriched',v_enriched,'omitted',v_omitted,'subtopicsCreated',v_subtopics_created);
end;
$function$;

create or replace function catalog_import_private.import_v4_core(
  p_actor_user_id uuid,
  p_opposition_id uuid,
  p_topic_id uuid,
  p_package jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=pg_catalog,pg_temp
as $function$
declare
  v_opposition_code text; v_topic_number integer; v_subject_name text; v_resolved_topic_id uuid; v_topic_matches integer;
  v_row jsonb; v_secondary_code text; v_unit_id uuid; v_concept_id uuid; v_question_id uuid; v_subtopic_id uuid;
  v_import_id uuid; v_unit_count integer; v_concept_count integer; v_mapping_count integer; v_flashcard_count integer;
  v_capacity jsonb; v_capacity_status text; v_capacity_ceiling smallint; v_capacity_reason text; v_primary_count integer;
  v_existing_topic_id uuid;
begin
  if current_user not in ('factory_catalog_executor','v4_authenticated_executor') then
    raise exception 'V4 core requires a sanctioned technical executor' using errcode='42501';
  end if;
  if p_actor_user_id is distinct from nullif(current_setting('opoapp.catalog.actor_user_id',true),'')::uuid
     or p_opposition_id is distinct from nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid
     or p_topic_id is distinct from nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid
     or current_setting('opoapp.catalog.operation',true)<>'v4_import' then
    raise exception 'V4 core scope mismatch' using errcode='42501';
  end if;
  if p_package is null or jsonb_typeof(p_package)<>'object' then raise exception 'V4 content package must be a JSON object' using errcode='22023'; end if;
  if p_package->>'version' is distinct from '4.0' then raise exception 'Unsupported V4 content contract version: %',coalesce(p_package->>'version','<null>') using errcode='22023'; end if;
  if jsonb_typeof(p_package->'units') is distinct from 'array' or jsonb_typeof(p_package->'concepts') is distinct from 'array'
     or jsonb_typeof(p_package->'questionMappings') is distinct from 'array' or jsonb_typeof(p_package->'flashcards') is distinct from 'array' then
    raise exception 'units, concepts, questionMappings and flashcards must be arrays' using errcode='22023';
  end if;
  v_opposition_code:=nullif(btrim(p_package->>'oppositionCode'),'');
  if v_opposition_code is null then raise exception 'oppositionCode is required' using errcode='22023'; end if;
  if not exists(select 1 from public.oppositions o where o.id=p_opposition_id and o.code=v_opposition_code and o.published is true) then
    raise exception 'Package opposition does not match the locked published opposition' using errcode='22023';
  end if;
  begin v_topic_number:=(p_package->>'topicNumber')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'topicNumber must be a positive integer' using errcode='22023';
  end;
  if v_topic_number is null or v_topic_number<1 then raise exception 'topicNumber must be a positive integer' using errcode='22023'; end if;
  v_subject_name:=nullif(btrim(p_package->>'subjectName'),'');
  if v_subject_name is not null then
    select count(*)::integer,case when count(*)=1 then(array_agg(t.id order by t.id))[1] end
    into v_topic_matches,v_resolved_topic_id
    from public.topics t join public.subjects s on s.id=t.subject_id and s.opposition_id=t.opposition_id
    where t.opposition_id=p_opposition_id and t.numero=v_topic_number and s.nombre=v_subject_name;
    if v_topic_matches=0 then raise exception 'Topic % under subject % not found',v_topic_number,v_subject_name using errcode='22023';
    elsif v_topic_matches>1 then raise exception 'Topic % under subject % is not unique',v_topic_number,v_subject_name using errcode='22023'; end if;
  else
    select count(*)::integer,case when count(*)=1 then(array_agg(t.id order by t.id))[1] end
    into v_topic_matches,v_resolved_topic_id from public.topics t
    where t.opposition_id=p_opposition_id and t.numero=v_topic_number;
    if v_topic_matches=0 then raise exception 'Topic % not found in opposition',v_topic_number using errcode='22023';
    elsif v_topic_matches>1 then raise exception 'Topic % is ambiguous in opposition; subjectName is required',v_topic_number using errcode='22023'; end if;
  end if;
  if v_resolved_topic_id is distinct from p_topic_id then raise exception 'Package topic does not match locked topic' using errcode='42501'; end if;

  v_unit_count:=jsonb_array_length(p_package->'units');
  v_concept_count:=jsonb_array_length(p_package->'concepts');
  v_mapping_count:=jsonb_array_length(p_package->'questionMappings');
  v_flashcard_count:=jsonb_array_length(p_package->'flashcards');

  for v_row in select value from jsonb_array_elements(p_package->'units') loop
    if nullif(btrim(v_row->>'code'),'') is null or nullif(btrim(v_row->>'title'),'') is null
       or nullif(btrim(v_row->>'studySummary'),'') is null then
      raise exception 'Every study unit requires code, title and studySummary' using errcode='22023';
    end if;
    select u.topic_id into v_existing_topic_id from public.study_units u
    where u.opposition_id=p_opposition_id and u.code=btrim(v_row->>'code');
    if v_existing_topic_id is not null and v_existing_topic_id<>p_topic_id then
      raise exception 'Study unit code % belongs to another topic',v_row->>'code' using errcode='23505';
    end if;
    v_subtopic_id:=null;
    if nullif(btrim(v_row->>'sourceSubtopicName'),'') is not null then
      select case when count(*)=1 then(array_agg(s.id))[1] end into v_subtopic_id
      from public.subtopics s
      where s.opposition_id=p_opposition_id and s.topic_id=p_topic_id and s.nombre=v_row->>'sourceSubtopicName';
    end if;
    insert into public.study_units(opposition_id,topic_id,subtopic_id,code,title,position,estimated_minutes,
      study_summary,exam_keys,confusions,traps,mnemonics,source_refs,active,created_by,updated_at)
    values(p_opposition_id,p_topic_id,v_subtopic_id,btrim(v_row->>'code'),btrim(v_row->>'title'),
      coalesce((v_row->>'position')::integer,0),coalesce((v_row->>'estimatedMinutes')::integer,5),v_row->>'studySummary',
      coalesce(v_row->'examKeys','[]'::jsonb),coalesce(v_row->'confusions','[]'::jsonb),coalesce(v_row->'traps','[]'::jsonb),
      coalesce(v_row->'mnemonics','[]'::jsonb),coalesce(v_row->'sourceRefs','[]'::jsonb),true,p_actor_user_id,now())
    on conflict(opposition_id,code) do update set
      topic_id=excluded.topic_id,subtopic_id=excluded.subtopic_id,title=excluded.title,position=excluded.position,
      estimated_minutes=excluded.estimated_minutes,study_summary=excluded.study_summary,exam_keys=excluded.exam_keys,
      confusions=excluded.confusions,traps=excluded.traps,mnemonics=excluded.mnemonics,source_refs=excluded.source_refs,
      active=true,updated_at=now();
  end loop;

  for v_row in select value from jsonb_array_elements(p_package->'concepts') loop
    select u.id into v_unit_id from public.study_units u
    where u.opposition_id=p_opposition_id and u.topic_id=p_topic_id and u.code=btrim(v_row->>'unitCode');
    if v_unit_id is null then raise exception 'Unknown study unit % for concept %',v_row->>'unitCode',v_row->>'code' using errcode='23503'; end if;
    if nullif(btrim(v_row->>'code'),'') is null or nullif(btrim(v_row->>'title'),'') is null then
      raise exception 'Every concept requires code and title' using errcode='22023';
    end if;
    select c.topic_id into v_existing_topic_id from public.concepts c
    where c.opposition_id=p_opposition_id and c.code=btrim(v_row->>'code');
    if v_existing_topic_id is not null and v_existing_topic_id<>p_topic_id then
      raise exception 'Concept code % belongs to another topic',v_row->>'code' using errcode='23505';
    end if;
    v_capacity:=v_row->'sourceCapacity'; v_capacity_status:=null; v_capacity_ceiling:=null; v_capacity_reason:=null;
    if v_capacity is not null then
      if jsonb_typeof(v_capacity)<>'object' then raise exception 'sourceCapacity for concept % must be an object',v_row->>'code' using errcode='22023'; end if;
      v_capacity_status:=nullif(btrim(v_capacity->>'status'),'');
      if v_capacity_status is distinct from 'source_limited' then raise exception 'Only source_limited may be persisted for concept %',v_row->>'code' using errcode='22023'; end if;
      begin v_capacity_ceiling:=(v_capacity->>'sourceSupportedCeiling')::smallint;
      exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'sourceSupportedCeiling for concept % must be an integer from 1 to 3',v_row->>'code' using errcode='22023';
      end;
      v_capacity_reason:=nullif(btrim(v_capacity->>'reason'),'');
      if v_capacity_ceiling is null or v_capacity_ceiling<1 or v_capacity_ceiling>3 or v_capacity_reason is null then
        raise exception 'Invalid source_limited capacity for concept %',v_row->>'code' using errcode='22023';
      end if;
    end if;
    insert into public.concepts(opposition_id,topic_id,study_unit_id,code,title,description,position,
      source_capacity_status,source_supported_ceiling,source_capacity_reason,active,created_by,updated_at)
    values(p_opposition_id,p_topic_id,v_unit_id,btrim(v_row->>'code'),btrim(v_row->>'title'),coalesce(v_row->>'description',''),
      coalesce((v_row->>'position')::integer,0),v_capacity_status,v_capacity_ceiling,v_capacity_reason,true,p_actor_user_id,now())
    on conflict(opposition_id,code) do update set
      topic_id=excluded.topic_id,study_unit_id=excluded.study_unit_id,title=excluded.title,description=excluded.description,
      position=excluded.position,source_capacity_status=excluded.source_capacity_status,
      source_supported_ceiling=excluded.source_supported_ceiling,source_capacity_reason=excluded.source_capacity_reason,
      active=true,updated_at=now();
  end loop;

  for v_row in select value from jsonb_array_elements(p_package->'questionMappings') loop
    select q.id into v_question_id from public.questions q
    where q.opposition_id=p_opposition_id and q.topic_id=p_topic_id and q.codigo=btrim(v_row->>'questionCode') and q.activa is true;
    if v_question_id is null then raise exception 'Active question % not found in package topic',v_row->>'questionCode' using errcode='23503'; end if;
    delete from public.question_concepts qc
    where qc.opposition_id=p_opposition_id and qc.topic_id=p_topic_id and qc.question_id=v_question_id;
    select c.id into v_concept_id from public.concepts c
    where c.opposition_id=p_opposition_id and c.topic_id=p_topic_id and c.code=btrim(v_row->>'primaryConceptCode') and c.active is true;
    if v_concept_id is null then raise exception 'Primary concept % not found for question %',v_row->>'primaryConceptCode',v_row->>'questionCode' using errcode='23503'; end if;
    insert into public.question_concepts(opposition_id,topic_id,question_id,concept_id,role,created_by)
    values(p_opposition_id,p_topic_id,v_question_id,v_concept_id,'primary',p_actor_user_id);
    for v_secondary_code in select value from jsonb_array_elements_text(coalesce(v_row->'secondaryConceptCodes','[]'::jsonb)) loop
      select c.id into v_concept_id from public.concepts c
      where c.opposition_id=p_opposition_id and c.topic_id=p_topic_id and c.code=btrim(v_secondary_code) and c.active is true;
      if v_concept_id is null then raise exception 'Secondary concept % not found for question %',v_secondary_code,v_row->>'questionCode' using errcode='23503'; end if;
      insert into public.question_concepts(opposition_id,topic_id,question_id,concept_id,role,created_by)
      values(p_opposition_id,p_topic_id,v_question_id,v_concept_id,'secondary',p_actor_user_id);
    end loop;
  end loop;

  for v_row in select value from jsonb_array_elements(p_package->'concepts') where value ? 'sourceCapacity' loop
    select c.id,c.source_supported_ceiling into v_concept_id,v_capacity_ceiling from public.concepts c
    where c.opposition_id=p_opposition_id and c.topic_id=p_topic_id and c.code=btrim(v_row->>'code') and c.active is true;
    select count(distinct qc.question_id)::integer into v_primary_count
    from public.question_concepts qc join public.questions q on q.id=qc.question_id and q.activa is true
    where qc.concept_id=v_concept_id and qc.role='primary';
    if v_primary_count>v_capacity_ceiling then
      raise exception 'Concept % has % active primary questions above sourceSupportedCeiling %',v_row->>'code',v_primary_count,v_capacity_ceiling using errcode='22023';
    end if;
  end loop;

  update public.flashcards f set active=false,updated_at=now()
  where f.opposition_id=p_opposition_id and f.concept_id in(
    select c.id from public.concepts c
    join jsonb_array_elements(p_package->'concepts') pc on c.code=btrim(pc->>'code')
    where c.opposition_id=p_opposition_id and c.topic_id=p_topic_id
  );
  for v_row in select value from jsonb_array_elements(p_package->'flashcards') loop
    select c.id into v_concept_id from public.concepts c
    where c.opposition_id=p_opposition_id and c.topic_id=p_topic_id and c.code=btrim(v_row->>'conceptCode') and c.active is true;
    if v_concept_id is null then raise exception 'Unknown concept % for flashcard %',v_row->>'conceptCode',v_row->>'code' using errcode='23503'; end if;
    if nullif(btrim(v_row->>'code'),'') is null or nullif(btrim(v_row->>'prompt'),'') is null or nullif(btrim(v_row->>'answer'),'') is null then
      raise exception 'Every flashcard requires code, prompt and answer' using errcode='22023';
    end if;
    select c.topic_id into v_existing_topic_id from public.flashcards f
    join public.concepts c on c.id=f.concept_id and c.opposition_id=f.opposition_id
    where f.opposition_id=p_opposition_id and f.code=btrim(v_row->>'code');
    if v_existing_topic_id is not null and v_existing_topic_id<>p_topic_id then
      raise exception 'Flashcard code % belongs to another topic',v_row->>'code' using errcode='23505';
    end if;
    insert into public.flashcards(opposition_id,concept_id,code,card_type,prompt,answer,position,source_refs,active,created_by,updated_at)
    values(p_opposition_id,v_concept_id,btrim(v_row->>'code'),coalesce(nullif(btrim(v_row->>'type'),''),'direct'),
      v_row->>'prompt',v_row->>'answer',coalesce((v_row->>'position')::integer,0),coalesce(v_row->'sourceRefs','[]'::jsonb),true,p_actor_user_id,now())
    on conflict(opposition_id,code) do update set
      concept_id=excluded.concept_id,card_type=excluded.card_type,prompt=excluded.prompt,answer=excluded.answer,
      position=excluded.position,source_refs=excluded.source_refs,active=true,updated_at=now();
  end loop;

  insert into public.study_content_imports(opposition_id,topic_id,contract_version,source_revision,unit_count,concept_count,
    question_mapping_count,flashcard_count,imported_by)
  values(p_opposition_id,p_topic_id,p_package->>'version',nullif(p_package->>'sourceRevision',''),v_unit_count,v_concept_count,
    v_mapping_count,v_flashcard_count,p_actor_user_id)
  returning id into v_import_id;

  return jsonb_build_object('importId',v_import_id,'oppositionCode',v_opposition_code,'topicNumber',v_topic_number,
    'units',v_unit_count,'concepts',v_concept_count,'questionMappings',v_mapping_count,'flashcards',v_flashcard_count);
end;
$function$;

create or replace function factory_admin.import_questions(
  p_actor_user_id uuid,
  p_opposition_id uuid,
  p_topic_id uuid,
  p_run_id uuid,
  p_payload jsonb,
  p_allowed_replacement_codes text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,pg_temp
as $function$
declare v_result jsonb; v_fingerprint text; v_error_code text;
begin
  if current_user<>'factory_catalog_executor' then raise exception 'Unexpected Factory executor' using errcode='42501'; end if;
  if session_user<>'postgres' then raise exception 'Factory entry point requires the sanctioned postgres management session' using errcode='42501'; end if;
  if p_actor_user_id is null or p_topic_id is null or p_run_id is null then raise exception 'actor, topic and run_id are required' using errcode='22023'; end if;
  if p_opposition_id is distinct from '00000000-0000-4000-8000-000000000002'::uuid then raise exception 'Factory v1 is restricted to Celador SMS' using errcode='42501'; end if;
  perform set_config('opoapp.catalog.actor_user_id',p_actor_user_id::text,true);
  perform set_config('opoapp.catalog.opposition_id',p_opposition_id::text,true);
  perform set_config('opoapp.catalog.topic_id',p_topic_id::text,true);
  perform set_config('opoapp.catalog.run_id',p_run_id::text,true);
  perform set_config('opoapp.catalog.operation','questions_import',true);
  if not exists(select 1 from public.oppositions o where o.id=p_opposition_id and o.code='celador-sms' and o.published is true) then raise exception 'Celador opposition is not available' using errcode='42501'; end if;
  if not exists(select 1 from public.opposition_admins oa where oa.user_id=p_actor_user_id and oa.opposition_id=p_opposition_id) then raise exception 'Factory actor is not an opposition administrator' using errcode='42501'; end if;
  if not exists(select 1 from public.topics t join public.subjects s on s.id=t.subject_id and s.opposition_id=t.opposition_id where t.id=p_topic_id and t.opposition_id=p_opposition_id and t.user_id=s.user_id) then raise exception 'Factory topic is invalid or has curator mismatch' using errcode='42501'; end if;
  v_fingerprint:=pg_catalog.encode(extensions.digest(coalesce(p_payload,'null'::jsonb)::text,'sha256'),'hex');
  insert into factory_admin.catalog_import_audit(run_id,actor_user_id,opposition_id,topic_id,operation,payload_fingerprint,allowed_replacement_codes,status)
  values(p_run_id,p_actor_user_id,p_opposition_id,p_topic_id,'questions_import',v_fingerprint,coalesce(p_allowed_replacement_codes,'{}'::text[]),'started');
  begin
    v_result:=catalog_import_private.import_questions_core(p_actor_user_id,p_opposition_id,p_topic_id,p_payload,coalesce(p_allowed_replacement_codes,'{}'::text[]));
  exception when others then
    get stacked diagnostics v_error_code=returned_sqlstate;
    update factory_admin.catalog_import_audit set status='failed',completed_at=now(),error_code=v_error_code
    where run_id=p_run_id and operation='questions_import';
    return jsonb_build_object('ok',false,'executor',current_user,'errorCode',v_error_code);
  end;
  update factory_admin.catalog_import_audit set status='succeeded',completed_at=now(),counts=v_result,error_code=null
  where run_id=p_run_id and operation='questions_import';
  return jsonb_build_object('ok',true,'executor',current_user,'result',v_result);
end;
$function$;

create or replace function factory_admin.import_v4_study_content(
  p_actor_user_id uuid,
  p_opposition_id uuid,
  p_topic_id uuid,
  p_run_id uuid,
  p_package jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,pg_temp
as $function$
declare v_result jsonb; v_counts jsonb; v_fingerprint text; v_error_code text;
begin
  if current_user<>'factory_catalog_executor' then raise exception 'Unexpected Factory executor' using errcode='42501'; end if;
  if session_user<>'postgres' then raise exception 'Factory entry point requires the sanctioned postgres management session' using errcode='42501'; end if;
  if p_actor_user_id is null or p_topic_id is null or p_run_id is null then raise exception 'actor, topic and run_id are required' using errcode='22023'; end if;
  if p_opposition_id is distinct from '00000000-0000-4000-8000-000000000002'::uuid then raise exception 'Factory v1 is restricted to Celador SMS' using errcode='42501'; end if;
  perform set_config('opoapp.catalog.actor_user_id',p_actor_user_id::text,true);
  perform set_config('opoapp.catalog.opposition_id',p_opposition_id::text,true);
  perform set_config('opoapp.catalog.topic_id',p_topic_id::text,true);
  perform set_config('opoapp.catalog.run_id',p_run_id::text,true);
  perform set_config('opoapp.catalog.operation','v4_import',true);
  if not exists(select 1 from public.oppositions o where o.id=p_opposition_id and o.code='celador-sms' and o.published is true) then raise exception 'Celador opposition is not available' using errcode='42501'; end if;
  if not exists(select 1 from public.opposition_admins oa where oa.user_id=p_actor_user_id and oa.opposition_id=p_opposition_id) then raise exception 'Factory actor is not an opposition administrator' using errcode='42501'; end if;
  if not exists(select 1 from public.topics t join public.subjects s on s.id=t.subject_id and s.opposition_id=t.opposition_id where t.id=p_topic_id and t.opposition_id=p_opposition_id and t.user_id=s.user_id) then raise exception 'Factory topic is invalid or has curator mismatch' using errcode='42501'; end if;
  v_fingerprint:=pg_catalog.encode(extensions.digest(coalesce(p_package,'null'::jsonb)::text,'sha256'),'hex');
  insert into factory_admin.catalog_import_audit(run_id,actor_user_id,opposition_id,topic_id,operation,payload_fingerprint,allowed_replacement_codes,status)
  values(p_run_id,p_actor_user_id,p_opposition_id,p_topic_id,'v4_import',v_fingerprint,'{}'::text[],'started');
  begin
    v_result:=catalog_import_private.import_v4_core(p_actor_user_id,p_opposition_id,p_topic_id,p_package);
  exception when others then
    get stacked diagnostics v_error_code=returned_sqlstate;
    update factory_admin.catalog_import_audit set status='failed',completed_at=now(),error_code=v_error_code
    where run_id=p_run_id and operation='v4_import';
    return jsonb_build_object('ok',false,'executor',current_user,'errorCode',v_error_code);
  end;
  v_counts:=jsonb_build_object('units',v_result->'units','concepts',v_result->'concepts','questionMappings',v_result->'questionMappings','flashcards',v_result->'flashcards');
  update factory_admin.catalog_import_audit set status='succeeded',completed_at=now(),counts=v_counts,error_code=null
  where run_id=p_run_id and operation='v4_import';
  return jsonb_build_object('ok',true,'executor',current_user,'result',v_result);
end;
$function$;

-- Historical authenticated wrapper. The later session_auth_uid migrations replace only identity resolution.
create or replace function public.import_v4_study_content(p_package jsonb)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,pg_temp
as $function$
declare
  v_user_id uuid:=(select auth.uid());
  v_opposition_code text; v_opposition_id uuid; v_topic_number integer; v_subject_name text;
  v_topic_matches integer; v_topic_id uuid; v_active_opposition_id uuid;
begin
  if current_user<>'v4_authenticated_executor' then raise exception 'Unexpected V4 executor' using errcode='42501'; end if;
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_package is null or jsonb_typeof(p_package)<>'object' then raise exception 'V4 content package must be a JSON object' using errcode='22023'; end if;
  if p_package->>'version' is distinct from '4.0' then raise exception 'Unsupported V4 content contract version: %',coalesce(p_package->>'version','<null>') using errcode='22023'; end if;
  if jsonb_typeof(p_package->'units') is distinct from 'array' or jsonb_typeof(p_package->'concepts') is distinct from 'array'
     or jsonb_typeof(p_package->'questionMappings') is distinct from 'array' or jsonb_typeof(p_package->'flashcards') is distinct from 'array' then
    raise exception 'units, concepts, questionMappings and flashcards must be arrays' using errcode='22023';
  end if;
  v_opposition_code:=nullif(btrim(p_package->>'oppositionCode'),'');
  if v_opposition_code is null then raise exception 'oppositionCode is required' using errcode='22023'; end if;
  perform set_config('opoapp.catalog.actor_user_id',v_user_id::text,true);
  perform set_config('opoapp.catalog.operation','v4_import',true);
  select o.id into v_opposition_id from public.oppositions o where o.code=v_opposition_code and o.published is true;
  if v_opposition_id is null then raise exception 'Published opposition not found for code %',v_opposition_code using errcode='22023'; end if;
  perform set_config('opoapp.catalog.opposition_id',v_opposition_id::text,true);
  v_active_opposition_id:=public.current_active_opposition_id();
  if v_active_opposition_id is distinct from v_opposition_id then raise exception 'The package opposition must be the current active opposition' using errcode='42501'; end if;
  if not exists(select 1 from public.opposition_admins a where a.user_id=v_user_id and a.opposition_id=v_opposition_id) then
    raise exception 'Opposition administrator permission required' using errcode='42501';
  end if;
  begin v_topic_number:=(p_package->>'topicNumber')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then raise exception 'topicNumber must be a positive integer' using errcode='22023'; end;
  if v_topic_number is null or v_topic_number<1 then raise exception 'topicNumber must be a positive integer' using errcode='22023'; end if;
  v_subject_name:=nullif(btrim(p_package->>'subjectName'),'');
  if v_subject_name is not null then
    select count(*)::integer,case when count(*)=1 then(array_agg(t.id order by t.id))[1] end
    into v_topic_matches,v_topic_id from public.topics t
    join public.subjects s on s.id=t.subject_id and s.opposition_id=t.opposition_id
    where t.opposition_id=v_opposition_id and t.numero=v_topic_number and s.nombre=v_subject_name;
    if v_topic_matches=0 then raise exception 'Topic % under subject % not found in opposition %',v_topic_number,v_subject_name,v_opposition_code using errcode='22023';
    elsif v_topic_matches>1 then raise exception 'Topic % under subject % is not unique in opposition %',v_topic_number,v_subject_name,v_opposition_code using errcode='22023'; end if;
  else
    select count(*)::integer,case when count(*)=1 then(array_agg(t.id order by t.id))[1] end
    into v_topic_matches,v_topic_id from public.topics t
    where t.opposition_id=v_opposition_id and t.numero=v_topic_number;
    if v_topic_matches=0 then raise exception 'Topic % not found in opposition %',v_topic_number,v_opposition_code using errcode='22023';
    elsif v_topic_matches>1 then raise exception 'Topic % is ambiguous in opposition %; subjectName is required',v_topic_number,v_opposition_code using errcode='22023'; end if;
  end if;
  perform set_config('opoapp.catalog.topic_id',v_topic_id::text,true);
  return catalog_import_private.import_v4_core(v_user_id,v_opposition_id,v_topic_id,p_package);
end;
$function$;

revoke all on function catalog_import_private.import_questions_core(uuid,uuid,uuid,jsonb,text[]) from public,anon,authenticated,service_role,postgres;
revoke all on function catalog_import_private.import_v4_core(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role,postgres;
revoke all on function factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[]) from public,anon,authenticated,service_role;
revoke all on function factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.import_v4_study_content(jsonb) from public,anon,service_role;
grant execute on function public.import_v4_study_content(jsonb) to authenticated;

grant execute on function factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[]) to supabase_privileged_role;
grant execute on function factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb) to supabase_privileged_role;
grant execute on function catalog_import_private.import_v4_core(uuid,uuid,uuid,jsonb) to factory_catalog_executor;

grant create on schema factory_admin,catalog_import_private to factory_catalog_executor;
grant factory_catalog_executor to postgres with set true,inherit false;
alter function factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[]) owner to factory_catalog_executor;
alter function factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb) owner to factory_catalog_executor;
alter function catalog_import_private.import_questions_core(uuid,uuid,uuid,jsonb,text[]) owner to factory_catalog_executor;
revoke create on schema factory_admin,catalog_import_private from factory_catalog_executor;
revoke factory_catalog_executor from postgres granted by postgres;

grant create on schema public,catalog_import_private to v4_authenticated_executor;
grant v4_authenticated_executor to postgres with set true,inherit false;
alter function public.import_v4_study_content(jsonb) owner to v4_authenticated_executor;
alter function catalog_import_private.import_v4_core(uuid,uuid,uuid,jsonb) owner to v4_authenticated_executor;
revoke create on schema public,catalog_import_private from v4_authenticated_executor;
revoke v4_authenticated_executor from postgres granted by postgres;

do $assert$
begin
  if pg_has_role('postgres','factory_catalog_executor','SET') or pg_has_role('postgres','factory_catalog_executor','USAGE')
     or pg_has_role('postgres','v4_authenticated_executor','SET') or pg_has_role('postgres','v4_authenticated_executor','USAGE') then
    raise exception 'postgres retained technical role transition';
  end if;
  if not has_function_privilege('postgres','factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[])','EXECUTE')
     or not has_function_privilege('postgres','factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb)','EXECUTE') then
    raise exception 'postgres sanctioned Factory entry grants missing';
  end if;
  if has_function_privilege('authenticated','factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[])','EXECUTE')
     or has_function_privilege('anon','factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[])','EXECUTE')
     or has_function_privilege('service_role','factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[])','EXECUTE') then
    raise exception 'Factory questions entry leaked';
  end if;
  if has_function_privilege('authenticated','factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb)','EXECUTE')
     or has_function_privilege('anon','factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb)','EXECUTE')
     or has_function_privilege('service_role','factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb)','EXECUTE') then
    raise exception 'Factory V4 entry leaked';
  end if;
  if not has_function_privilege('authenticated','public.import_v4_study_content(jsonb)','EXECUTE')
     or has_function_privilege('anon','public.import_v4_study_content(jsonb)','EXECUTE')
     or has_function_privilege('service_role','public.import_v4_study_content(jsonb)','EXECUTE') then
    raise exception 'Authenticated V4 client grants unsafe';
  end if;
end;
$assert$;
