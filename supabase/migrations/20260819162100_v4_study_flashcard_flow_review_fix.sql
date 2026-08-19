-- Keep the card row and unit lookup explicit so PL/pgSQL target assignment is unambiguous.
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
  v_card public.flashcards%rowtype;
  v_unit_id uuid;
  v_previous_rating text;
  v_previous_streak integer := 0;
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

  select card.*
  into v_card
  from public.flashcards card
  join public.concepts concept on concept.id = card.concept_id
  where card.id = p_flashcard_id
    and card.opposition_id = v_opposition_id
    and card.active is true
    and concept.active is true;

  if not found then
    raise exception 'Flashcard not found' using errcode = '22023';
  end if;

  select concept.study_unit_id
  into v_unit_id
  from public.concepts concept
  where concept.id = v_card.concept_id
    and concept.opposition_id = v_opposition_id
    and concept.active is true;

  if v_unit_id is null then
    raise exception 'Flashcard concept has no active study unit' using errcode = '22023';
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

  select review.rating, review.known_streak_after
  into v_previous_rating, v_previous_streak
  from public.flashcard_reviews review
  where review.user_id = v_user_id
    and review.opposition_id = v_opposition_id
    and review.flashcard_id = p_flashcard_id
  order by review.reviewed_at desc, review.id desc
  limit 1;

  if p_rating = 'known' then
    v_known_streak := case when v_previous_rating = 'known' then coalesce(v_previous_streak, 0) + 1 else 1 end;
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
  )
  returning id into v_review_id;

  select count(*)::int
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

revoke execute on function private.review_my_v4_flashcard(uuid, text) from public, anon;
grant execute on function private.review_my_v4_flashcard(uuid, text) to authenticated;
