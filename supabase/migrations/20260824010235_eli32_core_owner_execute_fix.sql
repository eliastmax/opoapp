-- ELI-32 · restore owner EXECUTE after ownership transfer.
grant factory_catalog_executor to postgres with set true, inherit false;
set local role factory_catalog_executor;
grant execute on function catalog_import_private.import_questions_core(uuid,uuid,uuid,jsonb,text[]) to factory_catalog_executor;
reset role;
revoke factory_catalog_executor from postgres granted by postgres;

grant v4_authenticated_executor to postgres with set true, inherit false;
set local role v4_authenticated_executor;
grant execute on function catalog_import_private.import_v4_core(uuid,uuid,uuid,jsonb) to v4_authenticated_executor;
reset role;
revoke v4_authenticated_executor from postgres granted by postgres;

do $assert$
begin
  if not has_function_privilege('factory_catalog_executor','catalog_import_private.import_questions_core(uuid,uuid,uuid,jsonb,text[])','EXECUTE') then
    raise exception 'factory_catalog_executor cannot execute questions core';
  end if;
  if not has_function_privilege('v4_authenticated_executor','catalog_import_private.import_v4_core(uuid,uuid,uuid,jsonb)','EXECUTE') then
    raise exception 'v4_authenticated_executor cannot execute V4 core';
  end if;
  if pg_has_role('postgres','factory_catalog_executor','SET') or pg_has_role('postgres','factory_catalog_executor','USAGE')
     or pg_has_role('postgres','v4_authenticated_executor','SET') or pg_has_role('postgres','v4_authenticated_executor','USAGE') then
    raise exception 'temporary technical role transition was not removed';
  end if;
end;$assert$;
