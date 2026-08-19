-- V4 study-unit execution and explainable flashcard review flow.

alter table public.flashcard_reviews
  add column if not exists rating text,
  add column if not exists known_streak_after integer not null default 0,
  add column if not exists scheduled_delay_minutes integer,
  add column if not exists next_review_at timestamptz;

update public.flashcard_reviews
set rating = case when correct then 'known' else 'missed' end
where rating is null;

alter table public.flashcard_reviews alter column rating set not null;

alter table public.flashcard_reviews drop constraint if exists flashcard_reviews_rating_check;
alter table public.flashcard_reviews
  add constraint flashcard_reviews_rating_check
  check (rating in ('known', 'unsure', 'missed'));

alter table public.flashcard_reviews drop constraint if exists flashcard_reviews_known_streak_after_check;
alter table public.flashcard_reviews
  add constraint flashcard_reviews_known_streak_after_check
  check (known_streak_after >= 0);

alter table public.flashcard_reviews drop constraint if exists flashcard_reviews_scheduled_delay_minutes_check;
alter table public.flashcard_reviews
  add constraint flashcard_reviews_scheduled_delay_minutes_check
  check (scheduled_delay_minutes is null or scheduled_delay_minutes > 0);

create index if not exists flashcard_reviews_user_card_latest_idx
  on public.flashcard_reviews (user_id, flashcard_id, reviewed_at desc, id desc);
create index if not exists flashcard_reviews_user_opposition_due_idx
  on public.flashcard_reviews (user_id, opposition_id, next_review_at);

-- All V4 evidence mutations go through validated RPCs.
revoke insert, update on public.study_unit_progress from authenticated;
revoke insert on public.flashcard_reviews from authenticated;

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
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_opposition_id := public.current_active_opposition_id();
  if v_opposition_id is null then
    raise exception 'An active opposition is required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.study_units unit
    where unit.id = p_study_unit_id
      and unit.opposition_id = v_opposition_id
      and unit.active is true
  ) then
    raise exception 'Study unit not found' using errcode = '22023';
  end if;

  insert into public.study_unit_progress (
    user_id, opposition_id, study_unit_id, first_opened_at, last_opened_at, updated_at
  ) values (
    v_user_id, v_opposition_id, p_study_unit_id, now(), now(), now()
  )
  on conflict (user_id, study_unit_id) do update
  set last_opened_at = excluded.last_opened_at,
      updated_at = excluded.updated_at
  returning first_opened_at, last_opened_at, completed_at, completion_count
  into v_first_opened_at, v_last_opened_at, v_completed_at, v_completion_count;

  select jsonb_build_object(
    'unit', jsonb_build_object(
      'id', unit.id,
      'code', unit.code,
      'topicId', unit.topic_id,
      'title', unit.title,
      'position', unit.position,
      'estimatedMinutes', unit.estimated_minutes,
      'studySummary', unit.study_summary,
      'examKeys', unit.exam_keys,
      'confusions', unit.confusions,
      'traps', unit.traps,
      'mnemonics', unit.mnemonics,
      'sourceRefs', unit.source_refs
    ),
    'progress', jsonb_build_object(
      'firstOpenedAt', v_first_opened_at,
      'lastOpenedAt', v_last_opened_at,
      'completedAt', v_completed_at,
      'completionCount', v_completion_count
    ),
    'concepts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', concept.id,
          'code', concept.code,
          'title', concept.title,
          'description', concept.description,
          'position', concept.position,
          'activePrimaryQuestions', (
            select count(*)::integer
            from public.question_concepts qc
            join public.questions question on question.id = qc.question_id
            where qc.concept_id = concept.id
              and qc.is_primary is true
              and question.activa is true
          )
        ) order by concept.position, concept.code
      )
      from public.concepts concept
      where concept.study_unit_id = unit.id
        and concept.opposition_id = v_opposition_id
        and concept.active is true
    ), '[]'::jsonb),
    'flashcards', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', card.id,
          'code', card.code,
          'conceptId', card.concept_id,
          'cardType', card.card_type,
          'prompt', card.prompt,
          'answer', card.answer,
          'position', card.position,
          'sourceRefs', card.source_refs
        ) order by card.position, card.code
      )
      from public.flashcards card
      join public.concepts card_concept on card_concept.id = card.concept_id
      where card_concept.study_unit_id = unit.id
        and card.opposition_id = v_opposition_id
        and card.active is true
        and card_concept.active is true
    ), '[]'::jsonb)
  )
  into v_result
  from public.study_units unit
  where unit.id = p_study_unit_id
    and unit.opposition_id = v_opposition_id;

  return v_result;
end;
$function$;

create or replace function public.open_my_v4_study_unit(p_study_unit_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.open_my_v4_study_unit(p_study_unit_id);
$function$;

create or replace function private.complete_my_v4_study_unit(p_study_unit_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
  v_completed_at timestamptz;
  v_completion_count integer;
  v_due_cards integer := 0;
  v_ready_concepts integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_opposition_id := public.current_active_opposition_id();
  if v_opposition_id is null then
    raise exception 'An active opposition is required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.study_units unit
    where unit.id = p_study_unit_id
      and unit.opposition_id = v_opposition_id
      and unit.active is true
  ) then
    raise exception 'Study unit not found' using errcode = '22023';
  end if;

  update public.study_unit_progress progress
  set completed_at = coalesce(progress.completed_at, now()),
      completion_count = progress.completion_count + 1,
      last_opened_at = coalesce(progress.last_opened_at, now()),
      updated_at = now()
  where progress.user_id = v_user_id
    and progress.opposition_id = v_opposition_id
    and progress.study_unit_id = p_study_unit_id
    and progress.first_opened_at is not null
  returning completed_at, completion_count
  into v_completed_at, v_completion_count;

  if not found then
    raise exception 'Open the study unit before completing it' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_due_cards
  from public.flashcards card
  join public.concepts concept on concept.id = card.concept_id
  left join lateral (
    select review.next_review_at
    from public.flashcard_reviews review
    where review.user_id = v_user_id
      and review.opposition_id = v_opposition_id
      and review.flashcard_id = card.id
    order by review.reviewed_at desc, review.id desc
    limit 1
  ) latest on true
  where card.opposition_id = v_opposition_id
    and card.active is true
    and concept.active is true
    and concept.study_unit_id = p_study_unit_id
    and (latest.next_review_at is null or latest.next_review_at <= now());

  select count(*)::integer
  into v_ready_concepts
  from public.concepts concept
  join public.user_concept_mastery mastery
    on mastery.user_id = v_user_id
   and mastery.opposition_id = v_opposition_id
   and mastery.concept_id = concept.id
  where concept.study_unit_id = p_study_unit_id
    and concept.active is true
    and mastery.state in ('seen', 'verifying')
    and (
      select count(*)
      from public.question_concepts qc
      join public.questions question on question.id = qc.question_id
      where qc.concept_id = concept.id
        and qc.is_primary is true
        and question.activa is true
    ) >= 4;

  return jsonb_build_object(
    'studyUnitId', p_study_unit_id,
    'completedAt', v_completed_at,
    'completionCount', v_completion_count,
    'dueFlashcards', v_due_cards,
    'conceptsReadyForVerification', v_ready_concepts,
    'nextStep', case
      when v_due_cards > 0 then 'flashcards'
      when v_ready_concepts > 0 then 'verify'
      else 'done'
    end
  );
end;
$function$;

create or replace function public.complete_my_v4_study_unit(p_study_unit_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.complete_my_v4_study_unit(p_study_unit_id);
$function$;

create or replace function public.get_my_v4_flashcard_queue(
  p_limit integer default 20,
  p_study_unit_id uuid default null
)
returns table (
  flashcard_id uuid,
  flashcard_code text,
  prompt text,
  answer text,
  concept_id uuid,
  concept_code text,
  concept_title text,
  study_unit_id uuid,
  study_unit_code text,
  study_unit_title text,
  last_rating text,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  known_streak integer,
  due_reason text
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_limit < 1 or p_limit > 50 then
    raise exception 'Queue limit must be between 1 and 50' using errcode = '22023';
  end if;

  v_opposition_id := public.current_active_opposition_id();
  if v_opposition_id is null then
    raise exception 'An active opposition is required' using errcode = '42501';
  end if;

  return query
  select
    card.id,
    card.code,
    card.prompt,
    card.answer,
    concept.id,
    concept.code,
    concept.title,
    unit.id,
    unit.code,
    unit.title,
    latest.rating,
    latest.reviewed_at,
    latest.next_review_at,
    coalesce(latest.known_streak_after, 0),
    case
      when latest.reviewed_at is null then 'new'
      when latest.rating = 'missed' then 'relearn'
      when latest.rating = 'unsure' then 'uncertain'
      else 'scheduled'
    end
  from public.flashcards card
  join public.concepts concept
    on concept.id = card.concept_id
   and concept.opposition_id = card.opposition_id
  join public.study_units unit
    on unit.id = concept.study_unit_id
   and unit.opposition_id = concept.opposition_id
  join public.study_unit_progress progress
    on progress.user_id = v_user_id
   and progress.opposition_id = v_opposition_id
   and progress.study_unit_id = unit.id
   and progress.completed_at is not null
  left join lateral (
    select review.rating, review.reviewed_at, review.next_review_at, review.known_streak_after
    from public.flashcard_reviews review
    where review.user_id = v_user_id
      and review.opposition_id = v_opposition_id
      and review.flashcard_id = card.id
    order by review.reviewed_at desc, review.id desc
    limit 1
  ) latest on true
  where card.opposition_id = v_opposition_id
    and card.active is true
    and concept.active is true
    and unit.active is true
    and (p_study_unit_id is null or unit.id = p_study_unit_id)
    and (latest.reviewed_at is null or latest.next_review_at <= now())
  order by
    case
      when latest.rating = 'missed' then 0
      when latest.reviewed_at is null then 1
      when latest.rating = 'unsure' then 2
      else 3
    end,
    coalesce(latest.next_review_at, '-infinity'::timestamptz),
    unit.position,
    concept.position,
    card.position,
    card.code
  limit p_limit;
end;
$function$;

create or replace function private.review_my_v4_flashcard(
  p_flashcard_id uuid,
  p_rating text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
  v_concept_id uuid;
  v_unit_id uuid;
  v_previous_rating text;
  v_previous_streak integer := 0;
  v_previous_next_review_at timestamptz;
  v_known_streak integer := 0;
  v_delay_minutes integer;
  v_next_review_at timestamptz;
  v_review_id uuid;
  v_remaining_due integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_rating not in ('known', 'unsure', 'missed') then
    raise exception 'Rating must be known, unsure or missed' using errcode = '22023';
  end if;

  v_opposition_id := public.current_active_opposition_id();
  if v_opposition_id is null then
    raise exception 'An active opposition is required' using errcode = '42501';
  end if;

  select card.concept_id, concept.study_unit_id
  into v_concept_id, v_unit_id
  from public.flashcards card
  join public.concepts concept on concept.id = card.concept_id
  where card.id = p_flashcard_id
    and card.opposition_id = v_opposition_id
    and card.active is true
    and concept.active is true;

  if not found then
    raise exception 'Flashcard not found' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.study_unit_progress progress
    where progress.user_id = v_user_id
      and progress.opposition_id = v_opposition_id
      and progress.study_unit_id = v_unit_id
      and progress.completed_at is not null
  ) then
    raise exception 'Complete the study unit before reviewing its flashcards' using errcode = '22023';
  end if;

  select review.rating, review.known_streak_after, review.next_review_at
  into v_previous_rating, v_previous_streak, v_previous_next_review_at
  from public.flashcard_reviews review
  where review.user_id = v_user_id
    and review.opposition_id = v_opposition_id
    and review.flashcard_id = p_flashcard_id
  order by review.reviewed_at desc, review.id desc
  limit 1;

  if v_previous_next_review_at is not null and v_previous_next_review_at > now() then
    raise exception 'Flashcard review is not due yet' using errcode = '22023';
  end if;

  if p_rating = 'known' then
    v_known_streak := case
      when v_previous_rating = 'known' then coalesce(v_previous_streak, 0) + 1
      else 1
    end;
    v_delay_minutes := case
      when v_known_streak = 1 then 3 * 24 * 60
      when v_known_streak = 2 then 7 * 24 * 60
      when v_known_streak = 3 then 14 * 24 * 60
      else 30 * 24 * 60
    end;
  elsif p_rating = 'unsure' then
    v_known_streak := 0;
    v_delay_minutes := 24 * 60;
  else
    v_known_streak := 0;
    v_delay_minutes := 10;
  end if;

  v_next_review_at := now() + make_interval(mins => v_delay_minutes);

  insert into public.flashcard_reviews (
    user_id,
    opposition_id,
    flashcard_id,
    correct,
    rating,
    known_streak_after,
    scheduled_delay_minutes,
    next_review_at,
    reviewed_at
  ) values (
    v_user_id,
    v_opposition_id,
    p_flashcard_id,
    p_rating = 'known',
    p_rating,
    v_known_streak,
    v_delay_minutes,
    v_next_review_at,
    now()
  ) returning id into v_review_id;

  select count(*)::integer
  into v_remaining_due
  from public.get_my_v4_flashcard_queue(50, v_unit_id);

  return jsonb_build_object(
    'reviewId', v_review_id,
    'flashcardId', p_flashcard_id,
    'rating', p_rating,
    'correct', p_rating = 'known',
    'knownStreakAfter', v_known_streak,
    'delayMinutes', v_delay_minutes,
    'nextReviewAt', v_next_review_at,
    'remainingDueInUnit', v_remaining_due
  );
end;
$function$;

create or replace function public.review_my_v4_flashcard(p_flashcard_id uuid, p_rating text)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.review_my_v4_flashcard(p_flashcard_id, p_rating);
$function$;

revoke execute on function private.open_my_v4_study_unit(uuid) from public, anon;
revoke execute on function private.complete_my_v4_study_unit(uuid) from public, anon;
revoke execute on function private.review_my_v4_flashcard(uuid, text) from public, anon;
grant execute on function private.open_my_v4_study_unit(uuid) to authenticated;
grant execute on function private.complete_my_v4_study_unit(uuid) to authenticated;
grant execute on function private.review_my_v4_flashcard(uuid, text) to authenticated;

revoke execute on function public.open_my_v4_study_unit(uuid) from public, anon;
revoke execute on function public.complete_my_v4_study_unit(uuid) from public, anon;
revoke execute on function public.get_my_v4_flashcard_queue(integer, uuid) from public, anon;
revoke execute on function public.review_my_v4_flashcard(uuid, text) from public, anon;
grant execute on function public.open_my_v4_study_unit(uuid) to authenticated;
grant execute on function public.complete_my_v4_study_unit(uuid) to authenticated;
grant execute on function public.get_my_v4_flashcard_queue(integer, uuid) to authenticated;
grant execute on function public.review_my_v4_flashcard(uuid, text) to authenticated;
