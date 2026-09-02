-- ELI-94 · Allow governed Celador hardening to remove decorative tipo_trampa metadata.
--
-- public.questions.tipo_trampa is nullable and its CHECK explicitly allows NULL.
-- The ELI-44 executor already writes `v_values->>'tipo_trampa'`, which naturally
-- becomes SQL NULL when the package contains JSON null. The only blocker is the
-- legacy validation branch that incorrectly classifies NULL tipo_trampa as empty
-- required academic content.
--
-- This migration patches only that exact guard. Every other ELI-44/ELI-46 scope,
-- stale-package, identity, completeness, distribution, lock, preservation-hash,
-- confirmation and audit guard remains byte-for-byte in the current function body.

do $eli94$
declare
  v_sql text;
  v_old text := $old$
if nullif(v_values->>'pregunta','') is null or nullif(v_values->>'opcion_a','') is null
       or nullif(v_values->>'opcion_b','') is null or nullif(v_values->>'opcion_c','') is null or nullif(v_values->>'opcion_d','') is null
       or nullif(v_values->>'tipo_trampa','') is null then
      raise exception 'ELI-44 mutation % contains empty required content', v_index using errcode='22023';
    end if;
$old$;
  v_new text := $new$
if nullif(v_values->>'pregunta','') is null or nullif(v_values->>'opcion_a','') is null
       or nullif(v_values->>'opcion_b','') is null or nullif(v_values->>'opcion_c','') is null or nullif(v_values->>'opcion_d','') is null then
      raise exception 'ELI-44 mutation % contains empty required content', v_index using errcode='22023';
    end if;
$new$;
  v_matches integer;
begin
  if not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'questions'
      and c.column_name = 'tipo_trampa'
      and c.is_nullable = 'YES'
  ) then
    raise exception 'ELI-94 requires public.questions.tipo_trampa to remain nullable';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.questions'::regclass
      and c.conname = 'questions_tipo_trampa_check'
      and pg_get_constraintdef(c.oid) ilike '%tipo_trampa IS NULL%'
  ) then
    raise exception 'ELI-94 requires the governed tipo_trampa CHECK to allow NULL';
  end if;

  select pg_get_functiondef('public.execute_celador_question_hardening(jsonb)'::regprocedure)
    into v_sql;

  if v_sql is null then
    raise exception 'ELI-94 could not read the Celador hardening executor';
  end if;

  v_matches := (length(v_sql) - length(replace(v_sql, v_old, ''))) / nullif(length(v_old), 0);
  if v_matches <> 1 then
    raise exception 'ELI-94 expected exactly one legacy tipo_trampa required-content guard, found %', v_matches;
  end if;

  v_sql := replace(v_sql, v_old, v_new);
  execute v_sql;
end
$eli94$;

comment on function public.execute_celador_question_hardening(jsonb) is
'ELI-44/ELI-46 governed Celador existing-question hardening executor. ELI-94 aligns tipo_trampa with the nullable metadata contract while preserving all existing package, stale, scope, atomicity and preservation guards.';
