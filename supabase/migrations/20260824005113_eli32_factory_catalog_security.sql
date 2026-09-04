-- ELI-32 · Factory catalog security foundation.
-- Infrastructure only. No academic content is inserted by this migration.

create role factory_catalog_executor nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls noreplication;
create role v4_authenticated_executor nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls noreplication;

create schema factory_admin;
create schema catalog_import_private;
revoke all on schema factory_admin from public, anon, authenticated, service_role;
revoke all on schema catalog_import_private from public, anon, authenticated, service_role;

create table factory_admin.catalog_import_audit (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  opposition_id uuid not null references public.oppositions(id) on delete restrict,
  topic_id uuid not null,
  operation text not null check (operation in ('questions_import','v4_import')),
  payload_fingerprint text not null check (payload_fingerprint ~ '^[0-9a-f]{64}$'),
  allowed_replacement_codes text[] not null default '{}'::text[],
  counts jsonb not null default '{}'::jsonb,
  status text not null check (status in ('started','succeeded','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text,
  constraint catalog_import_audit_topic_fk
    foreign key (opposition_id,topic_id) references public.topics(opposition_id,id) on delete restrict,
  constraint catalog_import_audit_run_operation_key unique (run_id,operation)
);
alter table factory_admin.catalog_import_audit enable row level security;

create policy eli32_factory_oppositions_select on public.oppositions for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true) in ('questions_import','v4_import') and id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and id='00000000-0000-4000-8000-000000000002'::uuid);
create policy eli32_factory_opposition_admins_select on public.opposition_admins for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true) in ('questions_import','v4_import') and user_id=nullif(current_setting('opoapp.catalog.actor_user_id',true),'')::uuid and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid);
create policy eli32_factory_subjects_select on public.subjects for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true) in ('questions_import','v4_import') and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and exists(select 1 from public.topics t where t.id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid and t.opposition_id=subjects.opposition_id and t.subject_id=subjects.id));
create policy eli32_factory_topics_select on public.topics for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true) in ('questions_import','v4_import') and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_subtopics_select on public.subtopics for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true) in ('questions_import','v4_import') and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_subtopics_insert on public.subtopics for insert to factory_catalog_executor
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='questions_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_questions_select on public.questions for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true) in ('questions_import','v4_import') and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_questions_insert on public.questions for insert to factory_catalog_executor
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='questions_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_questions_update on public.questions for update to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='questions_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid)
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='questions_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);

create policy eli32_factory_study_units_select on public.study_units for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_study_units_insert on public.study_units for insert to factory_catalog_executor
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_study_units_update on public.study_units for update to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid)
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_concepts_select on public.concepts for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_concepts_insert on public.concepts for insert to factory_catalog_executor
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_concepts_update on public.concepts for update to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid)
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_question_concepts_select on public.question_concepts for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_question_concepts_insert on public.question_concepts for insert to factory_catalog_executor
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_question_concepts_delete on public.question_concepts for delete to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_factory_flashcards_select on public.flashcards for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and exists(select 1 from public.concepts c where c.id=flashcards.concept_id and c.opposition_id=flashcards.opposition_id and c.topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid));
create policy eli32_factory_flashcards_insert on public.flashcards for insert to factory_catalog_executor
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and exists(select 1 from public.concepts c where c.id=flashcards.concept_id and c.opposition_id=flashcards.opposition_id and c.topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid));
create policy eli32_factory_flashcards_update on public.flashcards for update to factory_catalog_executor
using (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and exists(select 1 from public.concepts c where c.id=flashcards.concept_id and c.opposition_id=flashcards.opposition_id and c.topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid))
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and exists(select 1 from public.concepts c where c.id=flashcards.concept_id and c.opposition_id=flashcards.opposition_id and c.topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid));
create policy eli32_factory_study_import_insert on public.study_content_imports for insert to factory_catalog_executor
with check (current_user='factory_catalog_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid and imported_by=nullif(current_setting('opoapp.catalog.actor_user_id',true),'')::uuid);

-- Authenticated V4 executor policies. The auth.uid() references below are replaced by
-- the later session_auth_uid patch, which also revokes auth schema USAGE.
create policy eli32_v4_profiles_select on public.profiles for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and id=(select auth.uid()));
create policy eli32_v4_oppositions_select on public.oppositions for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and published is true);
create policy eli32_v4_opposition_admins_select on public.opposition_admins for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and user_id=(select auth.uid()) and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid);
create policy eli32_v4_subjects_select on public.subjects for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid);
create policy eli32_v4_topics_select on public.topics for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid);
create policy eli32_v4_subtopics_select on public.subtopics for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_questions_select on public.questions for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_study_units_select on public.study_units for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_study_units_insert on public.study_units for insert to v4_authenticated_executor
with check (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_study_units_update on public.study_units for update to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid)
with check (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_concepts_select on public.concepts for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_concepts_insert on public.concepts for insert to v4_authenticated_executor
with check (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_concepts_update on public.concepts for update to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid)
with check (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_question_concepts_select on public.question_concepts for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_question_concepts_insert on public.question_concepts for insert to v4_authenticated_executor
with check (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_question_concepts_delete on public.question_concepts for delete to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid);
create policy eli32_v4_flashcards_select on public.flashcards for select to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and exists(select 1 from public.concepts c where c.id=flashcards.concept_id and c.opposition_id=flashcards.opposition_id and c.topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid));
create policy eli32_v4_flashcards_insert on public.flashcards for insert to v4_authenticated_executor
with check (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and exists(select 1 from public.concepts c where c.id=flashcards.concept_id and c.opposition_id=flashcards.opposition_id and c.topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid));
create policy eli32_v4_flashcards_update on public.flashcards for update to v4_authenticated_executor
using (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and exists(select 1 from public.concepts c where c.id=flashcards.concept_id and c.opposition_id=flashcards.opposition_id and c.topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid))
with check (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and exists(select 1 from public.concepts c where c.id=flashcards.concept_id and c.opposition_id=flashcards.opposition_id and c.topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid));
create policy eli32_v4_study_import_insert on public.study_content_imports for insert to v4_authenticated_executor
with check (current_user='v4_authenticated_executor' and current_setting('opoapp.catalog.operation',true)='v4_import' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid and imported_by=(select auth.uid()));

create policy eli32_factory_audit_select on factory_admin.catalog_import_audit for select to factory_catalog_executor
using (current_user='factory_catalog_executor' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid and run_id=nullif(current_setting('opoapp.catalog.run_id',true),'')::uuid and operation=current_setting('opoapp.catalog.operation',true));
create policy eli32_factory_audit_insert on factory_admin.catalog_import_audit for insert to factory_catalog_executor
with check (current_user='factory_catalog_executor' and actor_user_id=nullif(current_setting('opoapp.catalog.actor_user_id',true),'')::uuid and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid and run_id=nullif(current_setting('opoapp.catalog.run_id',true),'')::uuid and operation=current_setting('opoapp.catalog.operation',true));
create policy eli32_factory_audit_update on factory_admin.catalog_import_audit for update to factory_catalog_executor
using (current_user='factory_catalog_executor' and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid and run_id=nullif(current_setting('opoapp.catalog.run_id',true),'')::uuid and operation=current_setting('opoapp.catalog.operation',true))
with check (current_user='factory_catalog_executor' and actor_user_id=nullif(current_setting('opoapp.catalog.actor_user_id',true),'')::uuid and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid and run_id=nullif(current_setting('opoapp.catalog.run_id',true),'')::uuid and operation=current_setting('opoapp.catalog.operation',true));

grant select on public.oppositions,public.opposition_admins,public.subjects,public.topics,public.subtopics,public.questions to factory_catalog_executor;
grant insert on public.subtopics,public.questions to factory_catalog_executor;
grant update on public.questions to factory_catalog_executor;
grant select,insert,update on public.study_units,public.concepts,public.flashcards to factory_catalog_executor;
grant select,insert,delete on public.question_concepts to factory_catalog_executor;
grant insert on public.study_content_imports to factory_catalog_executor;
grant select,insert,update on factory_admin.catalog_import_audit to factory_catalog_executor;
grant usage on schema extensions to factory_catalog_executor;
grant execute on function extensions.digest(text,text) to factory_catalog_executor;
grant usage on schema factory_admin,catalog_import_private to factory_catalog_executor;

grant select on public.profiles,public.oppositions,public.opposition_admins,public.subjects,public.topics,public.subtopics,public.questions to v4_authenticated_executor;
grant select,insert,update on public.study_units,public.concepts,public.flashcards to v4_authenticated_executor;
grant select,insert,delete on public.question_concepts to v4_authenticated_executor;
grant insert on public.study_content_imports to v4_authenticated_executor;
grant usage on schema auth to v4_authenticated_executor;
grant execute on function auth.uid() to v4_authenticated_executor;
grant execute on function public.current_active_opposition_id() to v4_authenticated_executor;
grant usage on schema catalog_import_private to v4_authenticated_executor;

do $assert$
begin
  if exists(select 1 from pg_roles r where r.rolname in ('factory_catalog_executor','v4_authenticated_executor') and (r.rolcanlogin or r.rolsuper or r.rolbypassrls or r.rolcreaterole or r.rolcreatedb or r.rolreplication)) then
    raise exception 'unsafe ELI-32 role attributes';
  end if;
  if pg_has_role('postgres','factory_catalog_executor','SET') or pg_has_role('postgres','factory_catalog_executor','USAGE') or pg_has_role('postgres','v4_authenticated_executor','SET') or pg_has_role('postgres','v4_authenticated_executor','USAGE') then
    raise exception 'postgres inherited technical role privileges';
  end if;
  if exists(select 1 from pg_auth_members am join pg_roles g on g.oid=am.roleid join pg_roles m on m.oid=am.member where g.rolname in ('factory_catalog_executor','v4_authenticated_executor') and m.rolname in ('authenticated','anon','service_role')) then
    raise exception 'client membership leaked';
  end if;
end;
$assert$;
