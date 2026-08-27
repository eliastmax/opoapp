-- ELI-46 · Align questions.tipo_trampa with the governed metadata-slug contract.
--
-- The historical CHECK enumerated 14 early trap labels. Factory/hardening now
-- treats tipo_trampa as descriptive metadata and the governed maintenance
-- contract already requires a lowercase snake_case slug of at most 64 chars.
-- This migration changes schema validation only: it performs zero academic DML.

do $preflight$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.questions'::regclass
      and c.conname = 'questions_tipo_trampa_check'
      and c.contype = 'c'
  ) then
    raise exception 'ELI-46 requires the existing questions_tipo_trampa_check constraint';
  end if;

  if exists (
    select 1
    from public.questions q
    where q.tipo_trampa is not null
      and (
        char_length(q.tipo_trampa) not between 1 and 64
        or q.tipo_trampa !~ '^[a-z0-9_]+$'
      )
  ) then
    raise exception 'ELI-46 tipo_trampa lexical preflight failed: existing rows violate the governed slug contract';
  end if;
end
$preflight$;

alter table public.questions
  drop constraint questions_tipo_trampa_check;

alter table public.questions
  add constraint questions_tipo_trampa_check
  check (
    tipo_trampa is null
    or (
      char_length(tipo_trampa) between 1 and 64
      and tipo_trampa ~ '^[a-z0-9_]+$'
    )
  ) not valid;

alter table public.questions
  validate constraint questions_tipo_trampa_check;

comment on constraint questions_tipo_trampa_check on public.questions is
'Governed tipo_trampa metadata contract: NULL or lowercase snake_case slug, 1-64 characters. Replaces the historical fixed 14-label allowlist; no academic semantics are inferred by the database.';
