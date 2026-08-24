-- ELI-34: learner-facing concept Study persistence.
-- Additive infrastructure only: this migration intentionally inserts zero content rows.

create or replace function private.is_trimmed_nonempty_text_array(p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v_item jsonb;
  v_text text;
begin
  if p_value is null or pg_catalog.jsonb_typeof(p_value) <> 'array' then
    return false;
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_value)
  loop
    if pg_catalog.jsonb_typeof(v_item) <> 'string' then
      return false;
    end if;
    v_text := v_item #>> '{}';
    if v_text = '' or pg_catalog.btrim(v_text) = '' or v_text <> pg_catalog.btrim(v_text) then
      return false;
    end if;
  end loop;
  return true;
end;
$function$;

create or replace function private.is_valid_concept_source_evidence(p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v_item jsonb;
  v_key text;
  v_support jsonb;
  v_support_text text;
  v_seen_supports text[];
  v_page_start numeric;
  v_page_end numeric;
begin
  if p_value is null or pg_catalog.jsonb_typeof(p_value) <> 'array' then
    return false;
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_value)
  loop
    if pg_catalog.jsonb_typeof(v_item) <> 'object' then
      return false;
    end if;

    for v_key in select key from pg_catalog.jsonb_object_keys(v_item) as keys(key)
    loop
      if v_key not in ('source_id', 'locator', 'page_start', 'page_end', 'excerpt', 'supports') then
        return false;
      end if;
    end loop;

    if not (v_item ? 'source_id')
       or pg_catalog.jsonb_typeof(v_item -> 'source_id') <> 'string'
       or pg_catalog.btrim(v_item ->> 'source_id') = ''
       or (v_item ->> 'source_id') <> pg_catalog.btrim(v_item ->> 'source_id') then
      return false;
    end if;

    if v_item ? 'locator' then
      if pg_catalog.jsonb_typeof(v_item -> 'locator') <> 'string'
         or pg_catalog.btrim(v_item ->> 'locator') = ''
         or (v_item ->> 'locator') <> pg_catalog.btrim(v_item ->> 'locator') then
        return false;
      end if;
    end if;

    if v_item ? 'excerpt' then
      if pg_catalog.jsonb_typeof(v_item -> 'excerpt') <> 'string'
         or pg_catalog.btrim(v_item ->> 'excerpt') = ''
         or (v_item ->> 'excerpt') <> pg_catalog.btrim(v_item ->> 'excerpt') then
        return false;
      end if;
    end if;

    v_page_start := null;
    v_page_end := null;
    if v_item ? 'page_start' then
      if pg_catalog.jsonb_typeof(v_item -> 'page_start') <> 'number' then return false; end if;
      v_page_start := (v_item ->> 'page_start')::numeric;
      if v_page_start < 1 or pg_catalog.trunc(v_page_start) <> v_page_start then return false; end if;
    end if;

    if v_item ? 'page_end' then
      if not (v_item ? 'page_start') or pg_catalog.jsonb_typeof(v_item -> 'page_end') <> 'number' then return false; end if;
      v_page_end := (v_item ->> 'page_end')::numeric;
      if v_page_end < 1 or pg_catalog.trunc(v_page_end) <> v_page_end or v_page_end < v_page_start then return false; end if;
    end if;

    if not (v_item ? 'locator') and not (v_item ? 'page_start') then return false; end if;
    if not (v_item ? 'supports')
       or pg_catalog.jsonb_typeof(v_item -> 'supports') <> 'array'
       or pg_catalog.jsonb_array_length(v_item -> 'supports') = 0 then
      return false;
    end if;

    v_seen_supports := array[]::text[];
    for v_support in select value from pg_catalog.jsonb_array_elements(v_item -> 'supports')
    loop
      if pg_catalog.jsonb_typeof(v_support) <> 'string' then return false; end if;
      v_support_text := v_support #>> '{}';
      if v_support_text not in (
        'learner_title', 'introduction', 'main_content', 'memory_keys',
        'example', 'confusions', 'learner_source_refs'
      ) then
        return false;
      end if;
      if pg_catalog.array_position(v_seen_supports, v_support_text) is not null then return false; end if;
      v_seen_supports := pg_catalog.array_append(v_seen_supports, v_support_text);
    end loop;
  end loop;
  return true;
exception
  when invalid_text_representation or numeric_value_out_of_range then return false;
end;
$function$;

create or replace function private.is_safe_learner_markdown(p_value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $function$
declare
  v_line text;
  v_body text;
  v_rest text;
begin
  if p_value is null or p_value = '' or pg_catalog.btrim(p_value) = '' or p_value <> pg_catalog.btrim(p_value) then
    return false;
  end if;

  -- No raw HTML/autolinks, URLs, Markdown links/images, inline/fenced code.
  if p_value ~ '<[^>]*>'
     or p_value ~* '(https?://|mailto:)'
     or p_value ~ '!\[[^]]*\]\([^)]*\)'
     or p_value ~ '\[[^]]+\]\([^)]*\)'
     or pg_catalog.strpos(p_value, '`') > 0
     or pg_catalog.strpos(p_value, '~~~') > 0 then
    return false;
  end if;

  for v_line in select line from pg_catalog.regexp_split_to_table(p_value, E'\n') as lines(line)
  loop
    if v_line = '' then continue; end if;

    -- No indented code, blockquotes, tables, horizontal rules, or unsupported list markers.
    if v_line ~ E'^(    |\t)'
       or v_line ~ '^>'
       or pg_catalog.strpos(v_line, '|') > 0
       or v_line ~ '^(-{3,}|_{3,}|\*{3,})$'
       or v_line ~ '^\+ '
       or v_line ~ '^\* ' then
      return false;
    end if;

    v_body := v_line;
    if v_body ~ '^#{2,3} ' then
      v_body := pg_catalog.regexp_replace(v_body, '^#{2,3} ', '');
    elsif v_body ~ '^#' then
      return false;
    elsif v_body ~ '^- ' then
      v_body := pg_catalog.regexp_replace(v_body, '^- ', '');
    elsif v_body ~ '^[0-9]+[.] ' then
      v_body := pg_catalog.regexp_replace(v_body, '^[0-9]+[.] ', '');
    end if;

    if pg_catalog.btrim(v_body) = '' then return false; end if;

    -- Bold/italic are the only allowed inline Markdown constructs.
    v_rest := pg_catalog.regexp_replace(v_body, '\*\*[^*\n]+\*\*', '', 'g');
    v_rest := pg_catalog.regexp_replace(v_rest, '\*[^*\n]+\*', '', 'g');
    v_rest := pg_catalog.regexp_replace(v_rest, '_[^_\n]+_', '', 'g');
    if v_rest ~ '[*_\[\]~]' or pg_catalog.strpos(v_rest, E'\\') > 0 then return false; end if;
  end loop;
  return true;
end;
$function$;

revoke all on function private.is_trimmed_nonempty_text_array(jsonb) from public, anon, authenticated;
revoke all on function private.is_valid_concept_source_evidence(jsonb) from public, anon, authenticated;
revoke all on function private.is_safe_learner_markdown(text) from public, anon, authenticated;
grant execute on function private.is_trimmed_nonempty_text_array(jsonb) to service_role;
grant execute on function private.is_valid_concept_source_evidence(jsonb) to service_role;
grant execute on function private.is_safe_learner_markdown(text) to service_role;

create table public.concept_study_content (
  concept_id uuid primary key,
  opposition_id uuid not null,
  topic_id uuid not null,
  learner_title text not null,
  introduction text not null,
  main_content text not null,
  memory_keys jsonb not null default '[]'::jsonb,
  example text null,
  confusions jsonb not null default '[]'::jsonb,
  learner_source_refs jsonb not null default '[]'::jsonb,
  source_evidence jsonb not null default '[]'::jsonb,
  editorial_status text not null default 'draft',
  content_version integer not null default 1,
  created_by uuid null,
  updated_by uuid null,
  approved_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz null,

  constraint concept_study_content_scope_fk
    foreign key (opposition_id, topic_id, concept_id)
    references public.concepts (opposition_id, topic_id, id) on delete cascade,
  constraint concept_study_content_created_by_fk
    foreign key (created_by) references auth.users(id) on delete set null,
  constraint concept_study_content_updated_by_fk
    foreign key (updated_by) references auth.users(id) on delete set null,

  constraint concept_study_content_learner_title_check
    check (learner_title = pg_catalog.btrim(learner_title) and learner_title <> ''),
  constraint concept_study_content_introduction_check
    check (introduction = pg_catalog.btrim(introduction) and introduction <> ''),
  constraint concept_study_content_main_content_check
    check (
      main_content = pg_catalog.btrim(main_content)
      and main_content <> ''
      and private.is_safe_learner_markdown(main_content)
    ),
  constraint concept_study_content_example_check
    check (example is null or (example = pg_catalog.btrim(example) and example <> '')),
  constraint concept_study_content_memory_keys_check
    check (private.is_trimmed_nonempty_text_array(memory_keys)),
  constraint concept_study_content_confusions_check
    check (private.is_trimmed_nonempty_text_array(confusions)),
  constraint concept_study_content_learner_source_refs_check
    check (private.is_trimmed_nonempty_text_array(learner_source_refs)),
  constraint concept_study_content_source_evidence_check
    check (private.is_valid_concept_source_evidence(source_evidence)),
  constraint concept_study_content_editorial_status_check
    check (editorial_status in ('draft', 'reviewed', 'approved', 'retired')),
  constraint concept_study_content_content_version_check check (content_version > 0),
  constraint concept_study_content_approval_metadata_check
    check (
      (editorial_status = 'approved' and approved_at is not null and approved_by is not null)
      or (editorial_status <> 'approved' and approved_at is null and approved_by is null)
    ),
  constraint concept_study_content_approved_content_check
    check (
      editorial_status <> 'approved'
      or (
        pg_catalog.jsonb_array_length(memory_keys) >= 1
        and pg_catalog.jsonb_array_length(learner_source_refs) >= 1
        and pg_catalog.jsonb_array_length(source_evidence) >= 1
      )
    ),
  constraint concept_study_content_timestamps_check
    check (
      updated_at >= created_at
      and (approved_at is null or (approved_at >= created_at and approved_at <= updated_at))
    )
);

alter table public.concept_study_content enable row level security;
-- Deliberately no policies: learners cannot query or mutate this table directly.
revoke all on table public.concept_study_content from public, anon, authenticated;
grant select, insert, update, delete on table public.concept_study_content to service_role;

create or replace function public.import_concept_study_content(p_package jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_opposition_code text;
  v_opposition_id uuid;
  v_active_opposition_id uuid;
  v_topic_number integer;
  v_subject_name text;
  v_topic_id uuid;
  v_topic_matches integer;
  v_item jsonb;
  v_key text;
  v_concept_id uuid;
  v_concept_code text;
  v_expected_version integer;
  v_target_status text;
  v_approval_action text;
  v_learner_title text;
  v_introduction text;
  v_main_content text;
  v_memory_keys jsonb;
  v_example text;
  v_confusions jsonb;
  v_learner_source_refs jsonb;
  v_source_evidence jsonb;
  v_candidate_state jsonb;
  v_current_state jsonb;
  v_existing record;
  v_plan jsonb := '[]'::jsonb;
  v_plan_item jsonb;
  v_new_version integer;
  v_results jsonb := '[]'::jsonb;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_unchanged integer := 0;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_package is null or pg_catalog.jsonb_typeof(p_package) <> 'object' then
    raise exception 'Learner content package must be an object' using errcode = '22023';
  end if;

  for v_key in select key from pg_catalog.jsonb_object_keys(p_package) as keys(key)
  loop
    if v_key not in ('version', 'oppositionCode', 'topicNumber', 'subjectName', 'items') then
      raise exception 'Unsupported package key: %', v_key using errcode = '22023';
    end if;
  end loop;

  if p_package ->> 'version' is distinct from '1.0' then
    raise exception 'Unsupported learner content package version' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_typeof(p_package -> 'items') is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_package -> 'items') = 0 then
    raise exception 'items must be a non-empty array' using errcode = '22023';
  end if;

  if pg_catalog.jsonb_typeof(p_package -> 'oppositionCode') <> 'string' then
    raise exception 'oppositionCode is required' using errcode = '22023';
  end if;
  v_opposition_code := p_package ->> 'oppositionCode';
  if v_opposition_code = '' or pg_catalog.btrim(v_opposition_code) = '' or v_opposition_code <> pg_catalog.btrim(v_opposition_code) then
    raise exception 'oppositionCode must be canonical' using errcode = '22023';
  end if;

  select opposition.id into v_opposition_id
  from public.oppositions opposition
  where opposition.code = v_opposition_code and opposition.published is true;
  if v_opposition_id is null then raise exception 'Published opposition not found' using errcode = '22023'; end if;

  v_active_opposition_id := public.current_active_opposition_id();
  if v_active_opposition_id is distinct from v_opposition_id then
    raise exception 'Package opposition must be the active opposition' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.opposition_admins admin
    where admin.user_id = v_user_id and admin.opposition_id = v_opposition_id
  ) then
    raise exception 'Opposition administrator permission required' using errcode = '42501';
  end if;

  if pg_catalog.jsonb_typeof(p_package -> 'topicNumber') <> 'number' then
    raise exception 'topicNumber must be a positive integer' using errcode = '22023';
  end if;
  begin
    v_topic_number := (p_package ->> 'topicNumber')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'topicNumber must be a positive integer' using errcode = '22023';
  end;
  if v_topic_number < 1 then raise exception 'topicNumber must be a positive integer' using errcode = '22023'; end if;

  v_subject_name := null;
  if p_package ? 'subjectName' and pg_catalog.jsonb_typeof(p_package -> 'subjectName') <> 'null' then
    if pg_catalog.jsonb_typeof(p_package -> 'subjectName') <> 'string' then
      raise exception 'subjectName must be a canonical string or null' using errcode = '22023';
    end if;
    v_subject_name := p_package ->> 'subjectName';
    if v_subject_name = '' or pg_catalog.btrim(v_subject_name) = '' or v_subject_name <> pg_catalog.btrim(v_subject_name) then
      raise exception 'subjectName must be a canonical string or null' using errcode = '22023';
    end if;
  end if;

  if v_subject_name is not null then
    select count(*)::integer,
           case when count(*) = 1 then (pg_catalog.array_agg(topic.id order by topic.id))[1] else null end
    into v_topic_matches, v_topic_id
    from public.topics topic
    join public.subjects subject on subject.id = topic.subject_id and subject.opposition_id = topic.opposition_id
    where topic.opposition_id = v_opposition_id and topic.numero = v_topic_number and subject.nombre = v_subject_name;
  else
    select count(*)::integer,
           case when count(*) = 1 then (pg_catalog.array_agg(topic.id order by topic.id))[1] else null end
    into v_topic_matches, v_topic_id
    from public.topics topic
    where topic.opposition_id = v_opposition_id and topic.numero = v_topic_number;
  end if;
  if v_topic_matches = 0 then raise exception 'Topic not found in package opposition' using errcode = '22023'; end if;
  if v_topic_matches > 1 then raise exception 'Topic is ambiguous; subjectName is required' using errcode = '22023'; end if;

  if exists (
    select 1 from (
      select item ->> 'conceptCode' as concept_code
      from pg_catalog.jsonb_array_elements(p_package -> 'items') as items(item)
      group by item ->> 'conceptCode' having count(*) > 1
    ) duplicates
  ) then
    raise exception 'Duplicate conceptCode in learner content package' using errcode = '22023';
  end if;

  -- PASS 1: validate all items and build an in-memory plan. No writes occur in this pass.
  for v_item in select value from pg_catalog.jsonb_array_elements(p_package -> 'items')
  loop
    if pg_catalog.jsonb_typeof(v_item) <> 'object' then
      raise exception 'Every learner content item must be an object' using errcode = '22023';
    end if;
    for v_key in select key from pg_catalog.jsonb_object_keys(v_item) as keys(key)
    loop
      if v_key not in (
        'conceptCode', 'expectedContentVersion', 'learnerTitle', 'introduction', 'mainContent',
        'memoryKeys', 'example', 'confusions', 'learnerSourceRefs', 'sourceEvidence',
        'editorialStatus', 'approvalAction'
      ) then
        raise exception 'Unsupported learner content item key: %', v_key using errcode = '22023';
      end if;
    end loop;

    if pg_catalog.jsonb_typeof(v_item -> 'conceptCode') <> 'string' then
      raise exception 'Every item requires conceptCode' using errcode = '22023';
    end if;
    v_concept_code := v_item ->> 'conceptCode';
    if v_concept_code = '' or pg_catalog.btrim(v_concept_code) = '' or v_concept_code <> pg_catalog.btrim(v_concept_code) then
      raise exception 'conceptCode must be canonical' using errcode = '22023';
    end if;

    if not (v_item ? 'expectedContentVersion') then
      raise exception 'expectedContentVersion key is required' using errcode = '22023';
    end if;
    if pg_catalog.jsonb_typeof(v_item -> 'expectedContentVersion') = 'null' then
      v_expected_version := null;
    elsif pg_catalog.jsonb_typeof(v_item -> 'expectedContentVersion') = 'number' then
      begin
        v_expected_version := (v_item ->> 'expectedContentVersion')::integer;
      exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'expectedContentVersion must be a positive integer or null' using errcode = '22023';
      end;
      if v_expected_version < 1 then raise exception 'expectedContentVersion must be a positive integer or null' using errcode = '22023'; end if;
    else
      raise exception 'expectedContentVersion must be a positive integer or null' using errcode = '22023';
    end if;

    if pg_catalog.jsonb_typeof(v_item -> 'learnerTitle') <> 'string'
       or pg_catalog.jsonb_typeof(v_item -> 'introduction') <> 'string'
       or pg_catalog.jsonb_typeof(v_item -> 'mainContent') <> 'string' then
      raise exception 'learnerTitle, introduction and mainContent are required strings' using errcode = '22023';
    end if;
    v_learner_title := v_item ->> 'learnerTitle';
    v_introduction := v_item ->> 'introduction';
    v_main_content := v_item ->> 'mainContent';
    if v_learner_title = '' or pg_catalog.btrim(v_learner_title) = '' or v_learner_title <> pg_catalog.btrim(v_learner_title)
       or v_introduction = '' or pg_catalog.btrim(v_introduction) = '' or v_introduction <> pg_catalog.btrim(v_introduction)
       or v_main_content = '' or pg_catalog.btrim(v_main_content) = '' or v_main_content <> pg_catalog.btrim(v_main_content) then
      raise exception 'Learner text fields must be canonical and non-empty' using errcode = '22023';
    end if;
    if not private.is_safe_learner_markdown(v_main_content) then
      raise exception 'mainContent contains unsupported Markdown' using errcode = '22023';
    end if;

    if not (v_item ? 'memoryKeys') or not private.is_trimmed_nonempty_text_array(v_item -> 'memoryKeys') then
      raise exception 'Invalid memoryKeys' using errcode = '22023';
    end if;
    v_memory_keys := v_item -> 'memoryKeys';
    if not (v_item ? 'confusions') or not private.is_trimmed_nonempty_text_array(v_item -> 'confusions') then
      raise exception 'Invalid confusions' using errcode = '22023';
    end if;
    v_confusions := v_item -> 'confusions';
    if not (v_item ? 'learnerSourceRefs') or not private.is_trimmed_nonempty_text_array(v_item -> 'learnerSourceRefs') then
      raise exception 'Invalid learnerSourceRefs' using errcode = '22023';
    end if;
    v_learner_source_refs := v_item -> 'learnerSourceRefs';
    if not (v_item ? 'sourceEvidence') or not private.is_valid_concept_source_evidence(v_item -> 'sourceEvidence') then
      raise exception 'Invalid sourceEvidence' using errcode = '22023';
    end if;
    v_source_evidence := v_item -> 'sourceEvidence';

    if not (v_item ? 'example') or pg_catalog.jsonb_typeof(v_item -> 'example') not in ('string', 'null') then
      raise exception 'example must be a non-empty canonical string or null' using errcode = '22023';
    end if;
    if pg_catalog.jsonb_typeof(v_item -> 'example') = 'null' then
      v_example := null;
    else
      v_example := v_item ->> 'example';
      if v_example = '' or pg_catalog.btrim(v_example) = '' or v_example <> pg_catalog.btrim(v_example) then
        raise exception 'example must be a non-empty canonical string or null' using errcode = '22023';
      end if;
    end if;

    if pg_catalog.jsonb_typeof(v_item -> 'editorialStatus') <> 'string' then
      raise exception 'editorialStatus is required' using errcode = '22023';
    end if;
    v_target_status := v_item ->> 'editorialStatus';
    if v_target_status not in ('draft', 'reviewed', 'approved', 'retired') then
      raise exception 'Invalid editorialStatus' using errcode = '22023';
    end if;

    v_approval_action := null;
    if v_item ? 'approvalAction' and pg_catalog.jsonb_typeof(v_item -> 'approvalAction') <> 'null' then
      if pg_catalog.jsonb_typeof(v_item -> 'approvalAction') <> 'string' or v_item ->> 'approvalAction' <> 'approve' then
        raise exception 'approvalAction must be approve or null' using errcode = '22023';
      end if;
      v_approval_action := 'approve';
    end if;
    if v_target_status <> 'approved' and v_approval_action is not null then
      raise exception 'approvalAction=approve requires editorialStatus=approved' using errcode = '22023';
    end if;
    if v_target_status = 'approved' and (
      pg_catalog.jsonb_array_length(v_memory_keys) < 1
      or pg_catalog.jsonb_array_length(v_learner_source_refs) < 1
      or pg_catalog.jsonb_array_length(v_source_evidence) < 1
    ) then
      raise exception 'Approved content lacks required editorial evidence' using errcode = '22023';
    end if;

    select concept.id into v_concept_id
    from public.concepts concept
    where concept.opposition_id = v_opposition_id
      and concept.topic_id = v_topic_id
      and concept.code = v_concept_code
      and concept.active is true;
    if v_concept_id is null then raise exception 'Active concept not found in package topic' using errcode = '23503'; end if;

    v_candidate_state := pg_catalog.jsonb_build_object(
      'learnerTitle', v_learner_title,
      'introduction', v_introduction,
      'mainContent', v_main_content,
      'memoryKeys', v_memory_keys,
      'example', v_example,
      'confusions', v_confusions,
      'learnerSourceRefs', v_learner_source_refs,
      'sourceEvidence', v_source_evidence,
      'editorialStatus', v_target_status
    );

    select content.learner_title, content.introduction, content.main_content,
           content.memory_keys, content.example, content.confusions,
           content.learner_source_refs, content.source_evidence,
           content.editorial_status, content.content_version
    into v_existing
    from public.concept_study_content content
    where content.concept_id = v_concept_id;

    if found then
      v_current_state := pg_catalog.jsonb_build_object(
        'learnerTitle', v_existing.learner_title,
        'introduction', v_existing.introduction,
        'mainContent', v_existing.main_content,
        'memoryKeys', v_existing.memory_keys,
        'example', v_existing.example,
        'confusions', v_existing.confusions,
        'learnerSourceRefs', v_existing.learner_source_refs,
        'sourceEvidence', v_existing.source_evidence,
        'editorialStatus', v_existing.editorial_status
      );
      if v_candidate_state is distinct from v_current_state then
        if v_expected_version is null or v_expected_version <> v_existing.content_version then
          raise exception 'Concurrent learner content version mismatch for concept %', v_concept_code using errcode = '40001';
        end if;
        if v_target_status = 'approved' and v_approval_action is distinct from 'approve' then
          raise exception 'Changed approved content requires explicit approval' using errcode = '22023';
        end if;
      end if;
    else
      if v_expected_version is not null then
        raise exception 'New learner content requires expectedContentVersion=null' using errcode = '40001';
      end if;
      if v_target_status = 'approved' and v_approval_action is distinct from 'approve' then
        raise exception 'Initial approval requires approvalAction=approve' using errcode = '22023';
      end if;
    end if;

    v_plan := v_plan || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'conceptId', v_concept_id,
      'conceptCode', v_concept_code,
      'expectedContentVersion', v_expected_version,
      'learnerTitle', v_learner_title,
      'introduction', v_introduction,
      'mainContent', v_main_content,
      'memoryKeys', v_memory_keys,
      'example', v_example,
      'confusions', v_confusions,
      'learnerSourceRefs', v_learner_source_refs,
      'sourceEvidence', v_source_evidence,
      'editorialStatus', v_target_status,
      'approvalAction', v_approval_action,
      'candidateState', v_candidate_state
    ));
  end loop;

  -- PASS 2: lock/re-read each current row, recompute equality, and condition writes on version.
  for v_plan_item in select value from pg_catalog.jsonb_array_elements(v_plan)
  loop
    v_concept_id := (v_plan_item ->> 'conceptId')::uuid;
    v_concept_code := v_plan_item ->> 'conceptCode';
    v_target_status := v_plan_item ->> 'editorialStatus';
    v_approval_action := case when pg_catalog.jsonb_typeof(v_plan_item -> 'approvalAction') = 'null' then null else v_plan_item ->> 'approvalAction' end;
    v_expected_version := case when pg_catalog.jsonb_typeof(v_plan_item -> 'expectedContentVersion') = 'null' then null else (v_plan_item ->> 'expectedContentVersion')::integer end;
    v_candidate_state := v_plan_item -> 'candidateState';

    if not exists (
      select 1 from public.concepts concept
      where concept.id = v_concept_id
        and concept.opposition_id = v_opposition_id
        and concept.topic_id = v_topic_id
        and concept.code = v_concept_code
        and concept.active is true
    ) then
      raise exception 'Concept scope changed while importing learner content' using errcode = '40001';
    end if;

    select content.learner_title, content.introduction, content.main_content,
           content.memory_keys, content.example, content.confusions,
           content.learner_source_refs, content.source_evidence,
           content.editorial_status, content.content_version
    into v_existing
    from public.concept_study_content content
    where content.concept_id = v_concept_id
    for update;

    if found then
      v_current_state := pg_catalog.jsonb_build_object(
        'learnerTitle', v_existing.learner_title,
        'introduction', v_existing.introduction,
        'mainContent', v_existing.main_content,
        'memoryKeys', v_existing.memory_keys,
        'example', v_existing.example,
        'confusions', v_existing.confusions,
        'learnerSourceRefs', v_existing.learner_source_refs,
        'sourceEvidence', v_existing.source_evidence,
        'editorialStatus', v_existing.editorial_status
      );
      if v_candidate_state is not distinct from v_current_state then
        v_unchanged := v_unchanged + 1;
        v_results := v_results || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
          'conceptCode', v_concept_code,
          'action', 'noop',
          'contentVersion', v_existing.content_version,
          'editorialStatus', v_existing.editorial_status
        ));
        continue;
      end if;

      if v_expected_version is null or v_expected_version <> v_existing.content_version then
        raise exception 'Concurrent learner content version mismatch for concept %', v_concept_code using errcode = '40001';
      end if;
      if v_target_status = 'approved' and v_approval_action is distinct from 'approve' then
        raise exception 'Changed approved content requires explicit approval' using errcode = '22023';
      end if;

      update public.concept_study_content
      set learner_title = v_plan_item ->> 'learnerTitle',
          introduction = v_plan_item ->> 'introduction',
          main_content = v_plan_item ->> 'mainContent',
          memory_keys = v_plan_item -> 'memoryKeys',
          example = case when pg_catalog.jsonb_typeof(v_plan_item -> 'example') = 'null' then null else v_plan_item ->> 'example' end,
          confusions = v_plan_item -> 'confusions',
          learner_source_refs = v_plan_item -> 'learnerSourceRefs',
          source_evidence = v_plan_item -> 'sourceEvidence',
          editorial_status = v_target_status,
          content_version = content_version + 1,
          updated_by = v_user_id,
          updated_at = now(),
          approved_by = case when v_target_status = 'approved' then v_user_id else null end,
          approved_at = case when v_target_status = 'approved' then now() else null end
      where concept_id = v_concept_id and content_version = v_expected_version
      returning content_version into v_new_version;
      if not found then
        raise exception 'Concurrent learner content modification for concept %', v_concept_code using errcode = '40001';
      end if;

      v_updated := v_updated + 1;
      v_results := v_results || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'conceptCode', v_concept_code,
        'action', 'updated',
        'contentVersion', v_new_version,
        'editorialStatus', v_target_status
      ));
    else
      if v_expected_version is not null then
        raise exception 'Learner content appeared concurrently for concept %', v_concept_code using errcode = '40001';
      end if;
      if v_target_status = 'approved' and v_approval_action is distinct from 'approve' then
        raise exception 'Initial approval requires approvalAction=approve' using errcode = '22023';
      end if;

      begin
        insert into public.concept_study_content (
          concept_id, opposition_id, topic_id,
          learner_title, introduction, main_content,
          memory_keys, example, confusions, learner_source_refs, source_evidence,
          editorial_status, content_version,
          created_by, updated_by, approved_by,
          created_at, updated_at, approved_at
        ) values (
          v_concept_id, v_opposition_id, v_topic_id,
          v_plan_item ->> 'learnerTitle', v_plan_item ->> 'introduction', v_plan_item ->> 'mainContent',
          v_plan_item -> 'memoryKeys',
          case when pg_catalog.jsonb_typeof(v_plan_item -> 'example') = 'null' then null else v_plan_item ->> 'example' end,
          v_plan_item -> 'confusions', v_plan_item -> 'learnerSourceRefs', v_plan_item -> 'sourceEvidence',
          v_target_status, 1,
          v_user_id, v_user_id,
          case when v_target_status = 'approved' then v_user_id else null end,
          now(), now(),
          case when v_target_status = 'approved' then now() else null end
        );
      exception when unique_violation then
        raise exception 'Learner content appeared concurrently for concept %', v_concept_code using errcode = '40001';
      end;

      v_inserted := v_inserted + 1;
      v_results := v_results || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'conceptCode', v_concept_code,
        'action', 'inserted',
        'contentVersion', 1,
        'editorialStatus', v_target_status
      ));
    end if;
  end loop;

  return pg_catalog.jsonb_build_object(
    'oppositionCode', v_opposition_code,
    'topicNumber', v_topic_number,
    'inserted', v_inserted,
    'updated', v_updated,
    'unchanged', v_unchanged,
    'items', v_results
  );
end;
$function$;

revoke all on function public.import_concept_study_content(jsonb) from public, anon, authenticated;
grant execute on function public.import_concept_study_content(jsonb) to authenticated;

-- Extend the existing V4 read model. Legacy keys remain intact.
create or replace function private.open_my_v4_study_unit(p_study_unit_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
  v_first_opened_at timestamptz;
  v_last_opened_at timestamptz;
  v_completed_at timestamptz;
  v_completion_count integer;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  v_opposition_id := public.current_active_opposition_id();
  if v_opposition_id is null then raise exception 'An active opposition is required' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.study_units unit
    where unit.id = p_study_unit_id and unit.opposition_id = v_opposition_id and unit.active is true
  ) then
    raise exception 'Study unit not found' using errcode = '22023';
  end if;

  insert into public.study_unit_progress (
    user_id, opposition_id, study_unit_id, first_opened_at, last_opened_at, updated_at
  ) values (
    v_user_id, v_opposition_id, p_study_unit_id, now(), now(), now()
  )
  on conflict (user_id, study_unit_id) do update
  set last_opened_at = excluded.last_opened_at, updated_at = excluded.updated_at
  returning first_opened_at, last_opened_at, completed_at, completion_count
  into v_first_opened_at, v_last_opened_at, v_completed_at, v_completion_count;

  select pg_catalog.jsonb_build_object(
    'unit', pg_catalog.jsonb_build_object(
      'id', unit.id, 'code', unit.code, 'topicId', unit.topic_id, 'title', unit.title,
      'position', unit.position, 'estimatedMinutes', unit.estimated_minutes,
      'studySummary', unit.study_summary, 'examKeys', unit.exam_keys,
      'confusions', unit.confusions, 'traps', unit.traps,
      'mnemonics', unit.mnemonics, 'sourceRefs', unit.source_refs
    ),
    'progress', pg_catalog.jsonb_build_object(
      'firstOpenedAt', v_first_opened_at, 'lastOpenedAt', v_last_opened_at,
      'completedAt', v_completed_at, 'completionCount', v_completion_count
    ),
    'concepts', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', concept.id,
          'code', concept.code,
          'title', concept.title,
          'description', concept.description,
          'position', concept.position,
          'activePrimaryQuestions', (
            select count(*)::integer
            from public.question_concepts qc
            join public.questions question
              on question.id = qc.question_id
             and question.opposition_id = concept.opposition_id
             and question.topic_id = concept.topic_id
            where qc.concept_id = concept.id
              and qc.opposition_id = concept.opposition_id
              and qc.topic_id = concept.topic_id
              and qc.role = 'primary'
              and question.activa is true
          ),
          'learnerContent', case
            when content.concept_id is null then null
            else pg_catalog.jsonb_build_object(
              'learnerTitle', content.learner_title,
              'introduction', content.introduction,
              'mainContent', content.main_content,
              'memoryKeys', content.memory_keys,
              'example', content.example,
              'confusions', content.confusions,
              'learnerSourceRefs', content.learner_source_refs
            )
          end
        ) order by concept.position, concept.code
      )
      from public.concepts concept
      left join public.concept_study_content content
        on content.concept_id = concept.id
       and content.opposition_id = concept.opposition_id
       and content.topic_id = concept.topic_id
       and content.opposition_id = v_opposition_id
       and content.editorial_status = 'approved'
      where concept.study_unit_id = unit.id
        and concept.opposition_id = v_opposition_id
        and concept.active is true
    ), '[]'::jsonb),
    'flashcards', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', card.id, 'code', card.code, 'conceptId', card.concept_id,
          'cardType', card.card_type, 'prompt', card.prompt, 'answer', card.answer,
          'position', card.position, 'sourceRefs', card.source_refs
        ) order by card.position, card.code
      )
      from public.flashcards card
      join public.concepts concept on concept.id = card.concept_id
      where concept.study_unit_id = unit.id
        and card.opposition_id = v_opposition_id
        and card.active is true
        and concept.active is true
    ), '[]'::jsonb)
  ) into v_result
  from public.study_units unit
  where unit.id = p_study_unit_id and unit.opposition_id = v_opposition_id;
  return v_result;
end;
$function$;

-- The private reader is no longer directly client-callable.
revoke all on function private.open_my_v4_study_unit(uuid) from public, anon, authenticated;

-- Wrapper remains the sole learner API. SECURITY DEFINER is required so callers do not need
-- EXECUTE on the private function; auth.uid() still resolves from the request JWT claims.
create or replace function public.open_my_v4_study_unit(p_study_unit_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select private.open_my_v4_study_unit(p_study_unit_id);
$function$;

revoke all on function public.open_my_v4_study_unit(uuid) from public, anon, authenticated;
grant execute on function public.open_my_v4_study_unit(uuid) to authenticated;
