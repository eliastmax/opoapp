-- ELI-32 technical smoke matrix.
-- Run only from the sanctioned postgres management session against the current pre-T04 checkpoint.
-- This script uses synthetic/empty fixtures only and ALWAYS rolls back.

begin;

-- Role and membership contract.
do $test$
declare
  r record;
begin
  for r in
    select * from pg_roles where rolname in ('factory_catalog_executor','v4_authenticated_executor')
  loop
    if r.rolcanlogin or r.rolsuper or r.rolbypassrls or r.rolcreaterole or r.rolcreatedb or r.rolinherit then
      raise exception 'unsafe technical role attributes for %', r.rolname;
    end if;
  end loop;

  if pg_has_role('postgres','factory_catalog_executor','SET')
     or pg_has_role('postgres','factory_catalog_executor','USAGE')
     or pg_has_role('postgres','v4_authenticated_executor','SET')
     or pg_has_role('postgres','v4_authenticated_executor','USAGE') then
    raise exception 'postgres can assume/inherit a technical role';
  end if;

  if exists (
    select 1
    from pg_auth_members am
    join pg_roles granted on granted.oid=am.roleid
    join pg_roles member on member.oid=am.member
    where granted.rolname in ('factory_catalog_executor','v4_authenticated_executor')
      and member.rolname in ('authenticated','anon','service_role')
  ) then
    raise exception 'client role membership leaked';
  end if;

  if exists (
    select 1
    from pg_auth_members am
    join pg_roles granted on granted.oid=am.roleid
    join pg_roles member on member.oid=am.member
    where granted.rolname in ('factory_catalog_executor','v4_authenticated_executor')
      and member.rolname='postgres'
      and (am.set_option or am.inherit_option)
  ) then
    raise exception 'postgres administrative membership is assumable/inherited';
  end if;
end
$test$;

-- Private entry-point and helper exposure.
do $test$
begin
  if has_function_privilege('authenticated','factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[])','EXECUTE')
     or has_function_privilege('anon','factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[])','EXECUTE')
     or has_function_privilege('service_role','factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[])','EXECUTE') then
    raise exception 'Factory questions entry point exposed to clients';
  end if;
  if has_function_privilege('authenticated','factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb)','EXECUTE')
     or has_function_privilege('anon','factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb)','EXECUTE')
     or has_function_privilege('service_role','factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb)','EXECUTE') then
    raise exception 'Factory V4 entry point exposed to clients';
  end if;
  if has_schema_privilege('v4_authenticated_executor','auth','USAGE') then
    raise exception 'v4_authenticated_executor unexpectedly has auth USAGE';
  end if;
  if has_function_privilege('authenticated','catalog_import_private.session_auth_uid()','EXECUTE')
     or has_function_privilege('factory_catalog_executor','catalog_import_private.session_auth_uid()','EXECUTE') then
    raise exception 'session_auth_uid helper leaked';
  end if;
end
$test$;

-- Raw postgres + forged Factory GUCs must still enter the normal authenticated trigger branch.
select set_config('opoapp.catalog.actor_user_id','81216496-1101-4d72-880f-83fbc516b1ff',true);
select set_config('opoapp.catalog.opposition_id','00000000-0000-4000-8000-000000000002',true);
select set_config('opoapp.catalog.topic_id','f3bb3e8f-a49d-5a2c-85e6-fa41ed285a50',true);
select set_config('opoapp.catalog.run_id','00000000-0000-4000-9000-000000000901',true);
select set_config('opoapp.catalog.operation','questions_import',true);
do $test$
begin
  begin
    insert into public.subtopics(user_id,topic_id,nombre,opposition_id)
    values(
      '81216496-1101-4d72-880f-83fbc516b1ff'::uuid,
      'f3bb3e8f-a49d-5a2c-85e6-fa41ed285a50'::uuid,
      'ELI32-SMOKE-SPOOF',
      '00000000-0000-4000-8000-000000000002'::uuid
    );
    raise exception 'raw postgres unexpectedly acquired Factory semantics';
  exception when sqlstate '42501' then
    if position('An active opposition is required' in sqlerrm)=0 then raise; end if;
  end;
end
$test$;

-- Sanctioned Factory transition: empty questions package and empty V4 package.
do $test$
declare
  r jsonb;
begin
  r := factory_admin.import_questions(
    '81216496-1101-4d72-880f-83fbc516b1ff'::uuid,
    '00000000-0000-4000-8000-000000000002'::uuid,
    'f3bb3e8f-a49d-5a2c-85e6-fa41ed285a50'::uuid,
    '00000000-0000-4000-9000-000000000902'::uuid,
    '[]'::jsonb,
    '{}'::text[]
  );
  if coalesce((r->>'ok')::boolean,false) is not true or r->>'executor' <> 'factory_catalog_executor' then
    raise exception 'Factory questions smoke failed: %', r;
  end if;

  r := factory_admin.import_v4_study_content(
    '81216496-1101-4d72-880f-83fbc516b1ff'::uuid,
    '00000000-0000-4000-8000-000000000002'::uuid,
    'f3bb3e8f-a49d-5a2c-85e6-fa41ed285a50'::uuid,
    '00000000-0000-4000-9000-000000000903'::uuid,
    jsonb_build_object(
      'version','4.0','oppositionCode','celador-sms','topicNumber',4,
      'subjectName','Celador SMS · Parte General',
      'units','[]'::jsonb,'concepts','[]'::jsonb,
      'questionMappings','[]'::jsonb,'flashcards','[]'::jsonb
    )
  );
  if coalesce((r->>'ok')::boolean,false) is not true or r->>'executor' <> 'factory_catalog_executor' then
    raise exception 'Factory V4 smoke failed: %', r;
  end if;
end
$test$;

-- Factory V4 atomicity: first synthetic unit is inserted, second fails; subtransaction must remove both content/import rows.
do $test$
declare
  r jsonb;
begin
  r := factory_admin.import_v4_study_content(
    '81216496-1101-4d72-880f-83fbc516b1ff'::uuid,
    '00000000-0000-4000-8000-000000000002'::uuid,
    'f3bb3e8f-a49d-5a2c-85e6-fa41ed285a50'::uuid,
    '00000000-0000-4000-9000-000000000904'::uuid,
    jsonb_build_object(
      'version','4.0','oppositionCode','celador-sms','topicNumber',4,
      'subjectName','Celador SMS · Parte General',
      'units',jsonb_build_array(
        jsonb_build_object('code','ELI32-SMOKE-ATOMIC-U1','title','Synthetic fixture','studySummary','Technical fixture','position',999,'estimatedMinutes',1),
        jsonb_build_object('code','ELI32-SMOKE-ATOMIC-U2','studySummary','Missing title must fail','position',1000,'estimatedMinutes',1)
      ),
      'concepts','[]'::jsonb,'questionMappings','[]'::jsonb,'flashcards','[]'::jsonb
    )
  );
  if coalesce((r->>'ok')::boolean,true) is not false or r->>'errorCode' <> '22023' then
    raise exception 'Factory V4 atomic fixture did not fail as expected: %', r;
  end if;
  if exists(select 1 from public.study_units where code like 'ELI32-SMOKE-ATOMIC-%') then
    raise exception 'Factory V4 atomicity left study units';
  end if;
end
$test$;

-- Authenticated wrapper: primary claim path.
set local role authenticated;
select set_config('request.jwt.claim.sub','81216496-1101-4d72-880f-83fbc516b1ff',true);
do $test$
declare r jsonb;
begin
  r := public.import_v4_study_content(jsonb_build_object(
    'version','4.0','oppositionCode','celador-sms','topicNumber',4,
    'subjectName','Celador SMS · Parte General',
    'units','[]'::jsonb,'concepts','[]'::jsonb,'questionMappings','[]'::jsonb,'flashcards','[]'::jsonb
  ));
  if r->>'oppositionCode' <> 'celador-sms' or (r->>'topicNumber')::integer <> 4 then
    raise exception 'authenticated V4 primary claim smoke failed: %', r;
  end if;
end
$test$;
reset role;

-- Authenticated wrapper: request.jwt.claims fallback.
set local role authenticated;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"sub":"81216496-1101-4d72-880f-83fbc516b1ff"}',true);
do $test$
declare r jsonb;
begin
  r := public.import_v4_study_content(jsonb_build_object(
    'version','4.0','oppositionCode','celador-sms','topicNumber',4,
    'subjectName','Celador SMS · Parte General',
    'units','[]'::jsonb,'concepts','[]'::jsonb,'questionMappings','[]'::jsonb,'flashcards','[]'::jsonb
  ));
  if r->>'oppositionCode' <> 'celador-sms' then
    raise exception 'authenticated V4 fallback smoke failed: %', r;
  end if;
end
$test$;
reset role;

-- Pre-T04 contamination contract. These checks deliberately encode the checkpoint delegated to the original T04 worker.
do $test$
begin
  if (select count(*) from public.questions where opposition_id='00000000-0000-4000-8000-000000000001'::uuid and activa) <> 4466 then
    raise exception 'Auxiliar contamination detected';
  end if;
  if (select count(*) from public.questions where opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id='f3bb3e8f-a49d-5a2c-85e6-fa41ed285a50'::uuid and activa) <> 12 then
    raise exception 'T04 question checkpoint drift';
  end if;
  if (select count(*) from public.subtopics where opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id='f3bb3e8f-a49d-5a2c-85e6-fa41ed285a50'::uuid) <> 3 then
    raise exception 'T04 subtopic checkpoint drift';
  end if;
  if exists(select 1 from public.study_units where opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id='f3bb3e8f-a49d-5a2c-85e6-fa41ed285a50'::uuid)
     or exists(select 1 from public.concepts where opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id='f3bb3e8f-a49d-5a2c-85e6-fa41ed285a50'::uuid)
     or exists(select 1 from public.question_concepts where opposition_id='00000000-0000-4000-8000-000000000002'::uuid and topic_id='f3bb3e8f-a49d-5a2c-85e6-fa41ed285a50'::uuid) then
    raise exception 'T04 V4 checkpoint drift';
  end if;
end
$test$;

rollback;
