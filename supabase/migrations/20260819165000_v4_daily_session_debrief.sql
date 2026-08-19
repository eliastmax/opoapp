-- V4 daily session orchestration. This layer coordinates existing evidence;
-- it never grants mastery by itself.

create table if not exists public.v4_daily_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opposition_id uuid not null references public.oppositions(id) on delete cascade,
  local_date date not null,
  available_minutes smallint not null check (available_minutes between 1 and 120),
  planned_minutes smallint not null default 0 check (planned_minutes between 0 and 120),
  status text not null default 'active' check (status in ('active','completed','closed_early')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opposition_id, local_date),
  unique (user_id, id)
);

create table if not exists public.v4_daily_session_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opposition_id uuid not null references public.oppositions(id) on delete cascade,
  session_id uuid not null,
  position smallint not null check (position between 1 and 4),
  kind text not null check (kind in ('review','repair','advance','verify')),
  label text not null,
  planned_minutes smallint not null check (planned_minutes between 1 and 30),
  topic_id uuid not null references public.topics(id) on delete restrict,
  study_unit_id uuid not null references public.study_units(id) on delete restrict,
  concept_id uuid references public.concepts(id) on delete restrict,
  target_questions smallint not null default 0 check (target_questions between 0 and 4),
  retention_checkpoint_days smallint check (retention_checkpoint_days in (3,7,14,30)),
  reason_code text not null,
  reason text not null default '',
  status text not null default 'planned' check (status in ('planned','in_progress','completed','skipped')),
  mastery_state_before text check (mastery_state_before is null or mastery_state_before in ('unseen','seen','verifying','consolidating','retained')),
  needs_attention_before boolean not null default false,
  linked_test_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint v4_daily_session_blocks_session_fk
    foreign key (user_id, session_id)
    references public.v4_daily_sessions(user_id, id)
    on delete cascade,
  constraint v4_daily_session_blocks_test_fk
    foreign key (user_id, linked_test_id)
    references public.tests(user_id, id)
    on delete restrict,
  unique (session_id, position)
);

create index if not exists v4_daily_sessions_user_date_idx
  on public.v4_daily_sessions(user_id, opposition_id, local_date desc);
create index if not exists v4_daily_sessions_user_status_idx
  on public.v4_daily_sessions(user_id, opposition_id, status, local_date desc);
create index if not exists v4_daily_session_blocks_session_idx
  on public.v4_daily_session_blocks(user_id, session_id, position);
create index if not exists v4_daily_session_blocks_concept_idx
  on public.v4_daily_session_blocks(user_id, concept_id)
  where concept_id is not null;
create index if not exists v4_daily_session_blocks_test_idx
  on public.v4_daily_session_blocks(user_id, linked_test_id)
  where linked_test_id is not null;

alter table public.v4_daily_sessions enable row level security;
alter table public.v4_daily_session_blocks enable row level security;

create policy v4_daily_sessions_select_own
  on public.v4_daily_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy v4_daily_session_blocks_select_own
  on public.v4_daily_session_blocks for select to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.v4_daily_sessions to authenticated;
grant select on public.v4_daily_session_blocks to authenticated;
revoke insert, update, delete on public.v4_daily_sessions from authenticated;
revoke insert, update, delete on public.v4_daily_session_blocks from authenticated;

create or replace function public.get_my_v4_daily_session(p_local_date date)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
  v_session_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  v_opposition_id := public.current_active_opposition_id();
  if v_opposition_id is null then
    raise exception 'An active opposition is required' using errcode='42501';
  end if;

  select session.id into v_session_id
  from public.v4_daily_sessions session
  where session.user_id=v_user_id
    and session.opposition_id=v_opposition_id
    and session.local_date=p_local_date;

  if v_session_id is null then return null; end if;

  select jsonb_build_object(
    'id', session.id,
    'localDate', session.local_date,
    'availableMinutes', session.available_minutes,
    'plannedMinutes', session.planned_minutes,
    'status', session.status,
    'startedAt', session.started_at,
    'completedAt', session.completed_at,
    'blocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', block.id,
        'position', block.position,
        'kind', block.kind,
        'label', block.label,
        'plannedMinutes', block.planned_minutes,
        'topicId', block.topic_id,
        'studyUnitId', block.study_unit_id,
        'conceptId', block.concept_id,
        'targetQuestions', block.target_questions,
        'retentionCheckpointDays', block.retention_checkpoint_days,
        'reasonCode', block.reason_code,
        'reason', block.reason,
        'status', block.status,
        'masteryStateBefore', block.mastery_state_before,
        'needsAttentionBefore', block.needs_attention_before,
        'linkedTestId', block.linked_test_id,
        'startedAt', block.started_at,
        'completedAt', block.completed_at
      ) order by block.position)
      from public.v4_daily_session_blocks block
      where block.user_id=v_user_id and block.session_id=session.id
    ),'[]'::jsonb)
  ) into v_result
  from public.v4_daily_sessions session
  where session.id=v_session_id and session.user_id=v_user_id;

  return v_result;
end;
$function$;

create or replace function private.create_or_replace_my_v4_daily_session(
  p_local_date date,
  p_available_minutes integer,
  p_blocks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
  v_session_id uuid;
  v_existing_status text;
  v_block jsonb;
  v_position integer := 0;
  v_kind text;
  v_label text;
  v_minutes integer;
  v_topic_id uuid;
  v_unit_id uuid;
  v_concept_id uuid;
  v_target_questions integer;
  v_checkpoint integer;
  v_reason_code text;
  v_reason text;
  v_planned_minutes integer := 0;
  v_before_state text;
  v_before_attention boolean;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_available_minutes < 1 or p_available_minutes > 120 then raise exception 'Available minutes must be between 1 and 120' using errcode='22023'; end if;
  if p_local_date < current_date - 1 or p_local_date > current_date + 1 then raise exception 'Local date is outside the allowed window' using errcode='22023'; end if;
  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) < 1 or jsonb_array_length(p_blocks) > 4 then
    raise exception 'Daily session must contain between 1 and 4 blocks' using errcode='22023';
  end if;

  v_opposition_id := public.current_active_opposition_id();
  if v_opposition_id is null then raise exception 'An active opposition is required' using errcode='42501'; end if;

  select session.id, session.status into v_session_id, v_existing_status
  from public.v4_daily_sessions session
  where session.user_id=v_user_id and session.opposition_id=v_opposition_id and session.local_date=p_local_date
  for update;

  if v_session_id is not null then
    if v_existing_status <> 'active' or exists (
      select 1 from public.v4_daily_session_blocks block
      where block.user_id=v_user_id and block.session_id=v_session_id and block.status <> 'planned'
    ) then
      return v_session_id;
    end if;
    delete from public.v4_daily_session_blocks block where block.user_id=v_user_id and block.session_id=v_session_id;
    update public.v4_daily_sessions session
    set available_minutes=p_available_minutes, planned_minutes=0, updated_at=now()
    where session.user_id=v_user_id and session.id=v_session_id;
  else
    insert into public.v4_daily_sessions(user_id,opposition_id,local_date,available_minutes,planned_minutes)
    values(v_user_id,v_opposition_id,p_local_date,p_available_minutes,0)
    returning id into v_session_id;
  end if;

  for v_block in select value from jsonb_array_elements(p_blocks)
  loop
    v_position := v_position + 1;
    v_kind := v_block->>'kind';
    v_label := coalesce(nullif(v_block->>'label',''), initcap(v_kind));
    v_minutes := coalesce((v_block->>'minutes')::integer,0);
    v_topic_id := (v_block->>'topicId')::uuid;
    v_unit_id := (v_block->>'studyUnitId')::uuid;
    v_concept_id := nullif(v_block->>'conceptId','')::uuid;
    v_target_questions := coalesce((v_block->>'targetQuestions')::integer,0);
    v_checkpoint := nullif(v_block->>'retentionCheckpointDays','')::integer;
    v_reason_code := coalesce(nullif(v_block->>'reasonCode',''),'unspecified');
    v_reason := coalesce(v_block->>'reason','');

    if v_kind not in ('review','repair','advance','verify') then raise exception 'Invalid daily block kind' using errcode='22023'; end if;
    if v_minutes < 1 or v_minutes > 30 then raise exception 'Invalid block minutes' using errcode='22023'; end if;
    if not exists (
      select 1 from public.study_units unit
      where unit.id=v_unit_id and unit.opposition_id=v_opposition_id and unit.topic_id=v_topic_id and unit.active
    ) then raise exception 'Daily block study unit is invalid' using errcode='22023'; end if;

    if v_kind='advance' then
      if v_concept_id is not null or v_target_questions <> 0 or v_checkpoint is not null then
        raise exception 'Advance blocks cannot carry concept-check metadata' using errcode='22023';
      end if;
      v_before_state := null;
      v_before_attention := false;
    else
      if v_concept_id is null then raise exception 'Concept block requires conceptId' using errcode='22023'; end if;
      if not exists (
        select 1 from public.concepts concept
        where concept.id=v_concept_id and concept.opposition_id=v_opposition_id and concept.topic_id=v_topic_id and concept.study_unit_id=v_unit_id and concept.active
      ) then raise exception 'Daily block concept is invalid' using errcode='22023'; end if;
      if (v_kind='review' and (v_target_questions < 1 or v_target_questions > 2))
        or (v_kind='repair' and (v_target_questions < 1 or v_target_questions > 3))
        or (v_kind='verify' and (v_target_questions < 2 or v_target_questions > 4)) then
        raise exception 'Invalid target question count for block kind' using errcode='22023';
      end if;
      if v_kind <> 'review' and v_checkpoint is not null then raise exception 'Only review blocks may carry retention checkpoints' using errcode='22023'; end if;
      if v_checkpoint is not null and v_checkpoint not in (3,7,14,30) then raise exception 'Invalid retention checkpoint' using errcode='22023'; end if;

      perform private.refresh_my_v4_concept_mastery(v_concept_id);
      select mastery.state, mastery.needs_attention
      into v_before_state, v_before_attention
      from public.user_concept_mastery mastery
      where mastery.user_id=v_user_id and mastery.opposition_id=v_opposition_id and mastery.concept_id=v_concept_id;
    end if;

    v_planned_minutes := v_planned_minutes + v_minutes;
    if v_planned_minutes > p_available_minutes then raise exception 'Planned blocks exceed available minutes' using errcode='22023'; end if;

    insert into public.v4_daily_session_blocks(
      user_id,opposition_id,session_id,position,kind,label,planned_minutes,topic_id,study_unit_id,concept_id,target_questions,retention_checkpoint_days,reason_code,reason,mastery_state_before,needs_attention_before
    ) values(
      v_user_id,v_opposition_id,v_session_id,v_position,v_kind,v_label,v_minutes,v_topic_id,v_unit_id,v_concept_id,v_target_questions,v_checkpoint,v_reason_code,v_reason,v_before_state,coalesce(v_before_attention,false)
    );
  end loop;

  update public.v4_daily_sessions session
  set planned_minutes=v_planned_minutes, updated_at=now()
  where session.user_id=v_user_id and session.id=v_session_id;

  return v_session_id;
end;
$function$;

create or replace function public.create_or_replace_my_v4_daily_session(p_local_date date,p_available_minutes integer,p_blocks jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select private.create_or_replace_my_v4_daily_session(p_local_date,p_available_minutes,p_blocks);
$function$;

create or replace function private.start_my_v4_daily_block(p_block_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid:=auth.uid();
  v_session_id uuid;
  v_position integer;
  v_status text;
  v_session_status text;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;

  select block.session_id,block.position,block.status,session.status
  into v_session_id,v_position,v_status,v_session_status
  from public.v4_daily_session_blocks block
  join public.v4_daily_sessions session on session.id=block.session_id and session.user_id=block.user_id
  where block.id=p_block_id and block.user_id=v_user_id
  for update of block,session;

  if v_session_id is null then raise exception 'Daily block not found' using errcode='22023'; end if;
  if v_session_status <> 'active' then raise exception 'Daily session is already closed' using errcode='22023'; end if;
  if v_status='completed' or v_status='skipped' then raise exception 'Daily block is already closed' using errcode='22023'; end if;
  if exists (
    select 1 from public.v4_daily_session_blocks previous
    where previous.user_id=v_user_id and previous.session_id=v_session_id and previous.position<v_position and previous.status not in ('completed','skipped')
  ) then raise exception 'Complete or skip the previous block first' using errcode='22023'; end if;

  update public.v4_daily_session_blocks block
  set status='in_progress',started_at=coalesce(block.started_at,now()),updated_at=now()
  where block.id=p_block_id and block.user_id=v_user_id;

  return public.get_my_v4_daily_session((select local_date from public.v4_daily_sessions where id=v_session_id and user_id=v_user_id));
end;
$function$;

create or replace function public.start_my_v4_daily_block(p_block_id uuid)
returns jsonb language sql security invoker set search_path='' as $function$
  select private.start_my_v4_daily_block(p_block_id);
$function$;

create or replace function private.complete_my_v4_daily_block(p_block_id uuid,p_linked_test_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid:=auth.uid();
  v_session_id uuid;
  v_kind text;
  v_block_status text;
  v_concept_id uuid;
  v_unit_id uuid;
  v_started_at timestamptz;
  v_group text;
  v_local_date date;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;

  select block.session_id,block.kind,block.status,block.concept_id,block.study_unit_id,block.started_at,session.local_date
  into v_session_id,v_kind,v_block_status,v_concept_id,v_unit_id,v_started_at,v_local_date
  from public.v4_daily_session_blocks block
  join public.v4_daily_sessions session on session.id=block.session_id and session.user_id=block.user_id
  where block.id=p_block_id and block.user_id=v_user_id and session.status='active'
  for update of block,session;

  if v_session_id is null then raise exception 'Active daily block not found' using errcode='22023'; end if;
  if v_block_status <> 'in_progress' or v_started_at is null then raise exception 'Start the daily block before completing it' using errcode='22023'; end if;

  if v_kind='advance' then
    if p_linked_test_id is not null then raise exception 'Advance blocks cannot link a test' using errcode='22023'; end if;
    if not exists (
      select 1 from public.study_unit_progress progress
      where progress.user_id=v_user_id and progress.study_unit_id=v_unit_id and progress.completed_at is not null and progress.completed_at>=v_started_at
    ) then raise exception 'Complete the study unit before completing the advance block' using errcode='22023'; end if;
  else
    if p_linked_test_id is null then raise exception 'Concept blocks require a completed concept check' using errcode='22023'; end if;
    v_group := case v_kind when 'review' then 'concept_review' when 'repair' then 'concept_repair' else 'concept_verify' end;
    if not exists (
      select 1
      from public.tests test
      where test.id=p_linked_test_id and test.user_id=v_user_id and test.completado is true
        and exists (
          select 1 from public.test_question_selection selection
          where selection.user_id=v_user_id and selection.test_id=test.id and selection.selection_concept_id=v_concept_id and selection.selection_group=v_group
        )
    ) then raise exception 'Linked test is not a completed check for this concept block' using errcode='22023'; end if;
  end if;

  update public.v4_daily_session_blocks block
  set status='completed',linked_test_id=p_linked_test_id,completed_at=now(),updated_at=now()
  where block.id=p_block_id and block.user_id=v_user_id;

  if not exists (
    select 1 from public.v4_daily_session_blocks block
    where block.user_id=v_user_id and block.session_id=v_session_id and block.status in ('planned','in_progress')
  ) then
    update public.v4_daily_sessions session
    set status='completed',completed_at=now(),updated_at=now()
    where session.id=v_session_id and session.user_id=v_user_id;
  end if;

  return public.get_my_v4_daily_session(v_local_date);
end;
$function$;

create or replace function public.complete_my_v4_daily_block(p_block_id uuid,p_linked_test_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $function$
  select private.complete_my_v4_daily_block(p_block_id,p_linked_test_id);
$function$;

create or replace function private.skip_my_v4_daily_block(p_block_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid:=auth.uid();
  v_session_id uuid;
  v_local_date date;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select block.session_id,session.local_date into v_session_id,v_local_date
  from public.v4_daily_session_blocks block
  join public.v4_daily_sessions session on session.id=block.session_id and session.user_id=block.user_id
  where block.id=p_block_id and block.user_id=v_user_id and session.status='active'
  for update of block,session;
  if v_session_id is null then raise exception 'Active daily block not found' using errcode='22023'; end if;

  update public.v4_daily_session_blocks block
  set status='skipped',completed_at=now(),updated_at=now()
  where block.id=p_block_id and block.user_id=v_user_id and block.status='planned';
  if not found then raise exception 'Only a planned block can be skipped' using errcode='22023'; end if;

  if not exists(select 1 from public.v4_daily_session_blocks block where block.user_id=v_user_id and block.session_id=v_session_id and block.status in ('planned','in_progress')) then
    update public.v4_daily_sessions session set status='completed',completed_at=now(),updated_at=now() where session.id=v_session_id and session.user_id=v_user_id;
  end if;
  return public.get_my_v4_daily_session(v_local_date);
end;
$function$;

create or replace function public.skip_my_v4_daily_block(p_block_id uuid)
returns jsonb language sql security invoker set search_path='' as $function$
  select private.skip_my_v4_daily_block(p_block_id);
$function$;

create or replace function private.close_my_v4_daily_session_early(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid:=auth.uid();
  v_local_date date;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select session.local_date into v_local_date
  from public.v4_daily_sessions session
  where session.id=p_session_id and session.user_id=v_user_id and session.status='active'
  for update;
  if v_local_date is null then raise exception 'Active daily session not found' using errcode='22023'; end if;
  if exists(select 1 from public.v4_daily_session_blocks block where block.user_id=v_user_id and block.session_id=p_session_id and block.status='in_progress') then
    raise exception 'Finish the current block or leave the session active to resume later' using errcode='22023';
  end if;
  update public.v4_daily_session_blocks block set status='skipped',completed_at=now(),updated_at=now()
  where block.user_id=v_user_id and block.session_id=p_session_id and block.status='planned';
  update public.v4_daily_sessions session set status='closed_early',completed_at=now(),updated_at=now()
  where session.id=p_session_id and session.user_id=v_user_id;
  return public.get_my_v4_daily_session(v_local_date);
end;
$function$;

create or replace function public.close_my_v4_daily_session_early(p_session_id uuid)
returns jsonb language sql security invoker set search_path='' as $function$
  select private.close_my_v4_daily_session_early(p_session_id);
$function$;

create or replace function public.get_my_v4_daily_debrief(p_session_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid:=auth.uid();
  v_opposition_id uuid;
  v_status text;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_total integer:=0;
  v_completed integer:=0;
  v_skipped integer:=0;
  v_improved integer:=0;
  v_new_retained integer:=0;
  v_attention_resolved integer:=0;
  v_attention_remaining integer:=0;
  v_tests integer:=0;
  v_questions integer:=0;
  v_correct integer:=0;
  v_failures integer:=0;
  v_doubts integer:=0;
  v_cards integer:=0;
  v_cards_known integer:=0;
  v_cards_unsure integer:=0;
  v_cards_missed integer:=0;
  v_next_due date;
  v_message_code text;
  v_concept_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;

  select session.opposition_id,session.status,session.started_at,coalesce(session.completed_at,now())
  into v_opposition_id,v_status,v_started_at,v_ended_at
  from public.v4_daily_sessions session
  where session.id=p_session_id and session.user_id=v_user_id;
  if v_opposition_id is null then raise exception 'Daily session not found' using errcode='22023'; end if;

  for v_concept_id in
    select distinct block.concept_id from public.v4_daily_session_blocks block
    where block.user_id=v_user_id and block.session_id=p_session_id and block.concept_id is not null
  loop
    perform public.refresh_my_v4_concept_mastery(v_concept_id);
  end loop;

  select count(*)::integer,count(*) filter(where block.status='completed')::integer,count(*) filter(where block.status='skipped')::integer
  into v_total,v_completed,v_skipped
  from public.v4_daily_session_blocks block
  where block.user_id=v_user_id and block.session_id=p_session_id;

  with concept_blocks as (
    select distinct on (block.concept_id)
      block.concept_id,block.mastery_state_before,block.needs_attention_before
    from public.v4_daily_session_blocks block
    where block.user_id=v_user_id and block.session_id=p_session_id and block.concept_id is not null
    order by block.concept_id,block.position
  ), compared as (
    select cb.*,
      mastery.state as after_state,
      coalesce(mastery.needs_attention,false) as after_attention,
      case cb.mastery_state_before when 'unseen' then 0 when 'seen' then 1 when 'verifying' then 2 when 'consolidating' then 3 when 'retained' then 4 else -1 end as before_rank,
      case mastery.state when 'unseen' then 0 when 'seen' then 1 when 'verifying' then 2 when 'consolidating' then 3 when 'retained' then 4 else -1 end as after_rank,
      mastery.next_review_on
    from concept_blocks cb
    left join public.user_concept_mastery mastery on mastery.user_id=v_user_id and mastery.opposition_id=v_opposition_id and mastery.concept_id=cb.concept_id
  )
  select
    count(*) filter(where after_rank>before_rank)::integer,
    count(*) filter(where after_state='retained' and coalesce(mastery_state_before,'')<>'retained')::integer,
    count(*) filter(where needs_attention_before and not after_attention)::integer,
    count(*) filter(where after_attention)::integer,
    min(next_review_on)
  into v_improved,v_new_retained,v_attention_resolved,v_attention_remaining,v_next_due
  from compared;

  select count(*)::integer,coalesce(sum(test.numero_preguntas),0)::integer,coalesce(sum(test.aciertos),0)::integer,coalesce(sum(test.fallos),0)::integer
  into v_tests,v_questions,v_correct,v_failures
  from public.v4_daily_session_blocks block
  join public.tests test on test.id=block.linked_test_id and test.user_id=block.user_id and test.completado
  where block.user_id=v_user_id and block.session_id=p_session_id and block.status='completed';

  select count(*)::integer
  into v_doubts
  from public.v4_daily_session_blocks block
  join public.test_answers answer on answer.user_id=block.user_id and answer.test_id=block.linked_test_id and answer.marked_doubt
  where block.user_id=v_user_id and block.session_id=p_session_id and block.status='completed';

  select
    count(*)::integer,
    count(*) filter(where review.rating='known')::integer,
    count(*) filter(where review.rating='unsure')::integer,
    count(*) filter(where review.rating='missed')::integer
  into v_cards,v_cards_known,v_cards_unsure,v_cards_missed
  from public.flashcard_reviews review
  join public.flashcards card on card.id=review.flashcard_id and card.opposition_id=review.opposition_id
  join public.concepts concept on concept.id=card.concept_id
  where review.user_id=v_user_id and review.opposition_id=v_opposition_id
    and review.reviewed_at between v_started_at and v_ended_at
    and exists (
      select 1 from public.v4_daily_session_blocks block
      where block.user_id=v_user_id and block.session_id=p_session_id and block.study_unit_id=concept.study_unit_id
    );

  v_message_code := case
    when v_status='active' then 'session_in_progress'
    when v_status='completed' and v_attention_remaining>0 then 'session_complete_attention'
    when v_status='completed' then 'session_complete'
    when v_attention_remaining>0 then 'session_closed_early_attention'
    else 'session_closed_early'
  end;

  return jsonb_build_object(
    'sessionId',p_session_id,
    'status',v_status,
    'completedBlocks',v_completed,
    'totalBlocks',v_total,
    'skippedBlocks',v_skipped,
    'improvedConcepts',coalesce(v_improved,0),
    'newlyRetainedConcepts',coalesce(v_new_retained,0),
    'attentionResolved',coalesce(v_attention_resolved,0),
    'attentionRemaining',coalesce(v_attention_remaining,0),
    'testsCompleted',v_tests,
    'questionsAnswered',v_questions,
    'correctAnswers',v_correct,
    'wrongAnswers',v_failures,
    'doubtsMarked',v_doubts,
    'flashcardsReviewed',v_cards,
    'flashcardsKnown',v_cards_known,
    'flashcardsUnsure',v_cards_unsure,
    'flashcardsMissed',v_cards_missed,
    'nextDueOn',v_next_due,
    'messageCode',v_message_code
  );
end;
$function$;

-- Public wrappers stay invoker. Private writers are outside the exposed API schema.
revoke execute on function private.create_or_replace_my_v4_daily_session(date,integer,jsonb) from public,anon;
revoke execute on function private.start_my_v4_daily_block(uuid) from public,anon;
revoke execute on function private.complete_my_v4_daily_block(uuid,uuid) from public,anon;
revoke execute on function private.skip_my_v4_daily_block(uuid) from public,anon;
revoke execute on function private.close_my_v4_daily_session_early(uuid) from public,anon;
grant execute on function private.create_or_replace_my_v4_daily_session(date,integer,jsonb) to authenticated;
grant execute on function private.start_my_v4_daily_block(uuid) to authenticated;
grant execute on function private.complete_my_v4_daily_block(uuid,uuid) to authenticated;
grant execute on function private.skip_my_v4_daily_block(uuid) to authenticated;
grant execute on function private.close_my_v4_daily_session_early(uuid) to authenticated;

revoke execute on function public.get_my_v4_daily_session(date) from public,anon;
revoke execute on function public.create_or_replace_my_v4_daily_session(date,integer,jsonb) from public,anon;
revoke execute on function public.start_my_v4_daily_block(uuid) from public,anon;
revoke execute on function public.complete_my_v4_daily_block(uuid,uuid) from public,anon;
revoke execute on function public.skip_my_v4_daily_block(uuid) from public,anon;
revoke execute on function public.close_my_v4_daily_session_early(uuid) from public,anon;
revoke execute on function public.get_my_v4_daily_debrief(uuid) from public,anon;
grant execute on function public.get_my_v4_daily_session(date) to authenticated;
grant execute on function public.create_or_replace_my_v4_daily_session(date,integer,jsonb) to authenticated;
grant execute on function public.start_my_v4_daily_block(uuid) to authenticated;
grant execute on function public.complete_my_v4_daily_block(uuid,uuid) to authenticated;
grant execute on function public.skip_my_v4_daily_block(uuid) to authenticated;
grant execute on function public.close_my_v4_daily_session_early(uuid) to authenticated;
grant execute on function public.get_my_v4_daily_debrief(uuid) to authenticated;
