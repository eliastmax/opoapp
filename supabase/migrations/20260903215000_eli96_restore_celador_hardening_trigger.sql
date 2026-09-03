-- ELI-96 · Restore governed Celador hardening trigger context after ELI-95.
--
-- ELI-95 replaced public.assign_catalog_opposition() to add an exact Auxiliar
-- T23 cleanup path, but that replacement omitted the ELI-46 trusted Celador
-- hardening branch. This migration restores only that previously-governed branch
-- in front of the current Auxiliar branch. It performs zero academic writes.
--
-- Existing Auxiliar hardening / ELI-42 / ELI-95, Factory and authenticated-admin
-- paths remain untouched. The patch fails closed if the expected ELI-95 marker
-- is not present or if a Celador branch is already present unexpectedly.

do $patch_eli96_trigger$
declare
  v_sql text;
  v_marker text := $marker$begin
  if current_user='postgres'
     and current_setting('opoapp.aux_hardening.operation',true)
         in ('question_hardening','eli42_scope_cleanup','eli95_t23_oos_cleanup') then$marker$;
  v_replacement text := $replacement$begin
  if current_user='postgres'
     and current_setting('opoapp.cel_hardening.operation',true)='question_hardening' then
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

  if current_user='postgres'
     and current_setting('opoapp.aux_hardening.operation',true)
         in ('question_hardening','eli42_scope_cleanup','eli95_t23_oos_cleanup') then$replacement$;
begin
  select pg_get_functiondef(p.oid)
    into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'assign_catalog_opposition'
    and pg_get_function_identity_arguments(p.oid) = '';

  if v_sql is null then
    raise exception 'ELI-96 requires public.assign_catalog_opposition()';
  end if;
  if strpos(v_sql, 'opoapp.cel_hardening.operation') > 0 then
    raise exception 'ELI-96 found an unexpected existing Celador hardening trigger branch';
  end if;
  if strpos(v_sql, v_marker) = 0 then
    raise exception 'ELI-96 could not locate the exact ELI-95 Auxiliar trigger entry point';
  end if;

  v_sql := replace(v_sql, v_marker, v_replacement);
  execute v_sql;
end
$patch_eli96_trigger$;
