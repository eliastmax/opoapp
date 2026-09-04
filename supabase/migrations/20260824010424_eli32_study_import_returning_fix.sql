-- ELI-32 · SELECT is required for INSERT ... RETURNING on study_content_imports.
grant select on public.study_content_imports to factory_catalog_executor, v4_authenticated_executor;

create policy eli32_factory_study_import_select
on public.study_content_imports for select to factory_catalog_executor
using (
  current_user='factory_catalog_executor'
  and current_setting('opoapp.catalog.operation',true)='v4_import'
  and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid
  and opposition_id='00000000-0000-4000-8000-000000000002'::uuid
  and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid
  and imported_by=nullif(current_setting('opoapp.catalog.actor_user_id',true),'')::uuid
);

create policy eli32_v4_study_import_select
on public.study_content_imports for select to v4_authenticated_executor
using (
  current_user='v4_authenticated_executor'
  and current_setting('opoapp.catalog.operation',true)='v4_import'
  and opposition_id=nullif(current_setting('opoapp.catalog.opposition_id',true),'')::uuid
  and topic_id=nullif(current_setting('opoapp.catalog.topic_id',true),'')::uuid
  and imported_by=(select auth.uid())
);

do $assert$
begin
  if not has_table_privilege('factory_catalog_executor','public.study_content_imports','SELECT,INSERT') then
    raise exception 'Factory study import RETURNING privileges missing';
  end if;
  if not has_table_privilege('v4_authenticated_executor','public.study_content_imports','SELECT,INSERT') then
    raise exception 'Authenticated V4 study import RETURNING privileges missing';
  end if;
end;$assert$;
