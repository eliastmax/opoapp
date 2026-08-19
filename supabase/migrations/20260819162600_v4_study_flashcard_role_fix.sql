-- question_concepts marks the main mapping with role='primary'.
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
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  v_opposition_id := public.current_active_opposition_id();
  if v_opposition_id is null then raise exception 'An active opposition is required' using errcode='42501'; end if;
  if not exists (select 1 from public.study_units u where u.id=p_study_unit_id and u.opposition_id=v_opposition_id and u.active) then raise exception 'Study unit not found' using errcode='22023'; end if;

  insert into public.study_unit_progress(user_id,opposition_id,study_unit_id,first_opened_at,last_opened_at,updated_at)
  values(v_user_id,v_opposition_id,p_study_unit_id,now(),now(),now())
  on conflict(user_id,study_unit_id) do update set last_opened_at=excluded.last_opened_at,updated_at=excluded.updated_at
  returning first_opened_at,last_opened_at,completed_at,completion_count
  into v_first_opened_at,v_last_opened_at,v_completed_at,v_completion_count;

  select jsonb_build_object(
    'unit',jsonb_build_object('id',u.id,'code',u.code,'topicId',u.topic_id,'title',u.title,'position',u.position,'estimatedMinutes',u.estimated_minutes,'studySummary',u.study_summary,'examKeys',u.exam_keys,'confusions',u.confusions,'traps',u.traps,'mnemonics',u.mnemonics,'sourceRefs',u.source_refs),
    'progress',jsonb_build_object('firstOpenedAt',v_first_opened_at,'lastOpenedAt',v_last_opened_at,'completedAt',v_completed_at,'completionCount',v_completion_count),
    'concepts',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'code',c.code,'title',c.title,'description',c.description,'position',c.position,'activePrimaryQuestions',(select count(*)::integer from public.question_concepts qc join public.questions q on q.id=qc.question_id where qc.concept_id=c.id and qc.role='primary' and q.activa)) order by c.position,c.code) from public.concepts c where c.study_unit_id=u.id and c.opposition_id=v_opposition_id and c.active),'[]'::jsonb),
    'flashcards',coalesce((select jsonb_agg(jsonb_build_object('id',fc.id,'code',fc.code,'conceptId',fc.concept_id,'cardType',fc.card_type,'prompt',fc.prompt,'answer',fc.answer,'position',fc.position,'sourceRefs',fc.source_refs) order by fc.position,fc.code) from public.flashcards fc join public.concepts cc on cc.id=fc.concept_id where cc.study_unit_id=u.id and fc.opposition_id=v_opposition_id and fc.active and cc.active),'[]'::jsonb)
  ) into v_result
  from public.study_units u
  where u.id=p_study_unit_id and u.opposition_id=v_opposition_id;
  return v_result;
end;
$function$;

create or replace function private.complete_my_v4_study_unit(p_study_unit_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid:=auth.uid();
  v_opposition_id uuid;
  v_completed timestamptz;
  v_count integer;
  v_due integer:=0;
  v_ready integer:=0;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  v_opposition_id:=public.current_active_opposition_id();
  if v_opposition_id is null then raise exception 'An active opposition is required' using errcode='42501'; end if;
  if not exists(select 1 from public.study_units u where u.id=p_study_unit_id and u.opposition_id=v_opposition_id and u.active) then raise exception 'Study unit not found' using errcode='22023'; end if;

  update public.study_unit_progress p
  set completed_at=coalesce(p.completed_at,now()),completion_count=p.completion_count+1,last_opened_at=coalesce(p.last_opened_at,now()),updated_at=now()
  where p.user_id=v_user_id and p.opposition_id=v_opposition_id and p.study_unit_id=p_study_unit_id and p.first_opened_at is not null
  returning completed_at,completion_count into v_completed,v_count;
  if not found then raise exception 'Open the study unit before completing it' using errcode='22023'; end if;

  select count(*)::integer into v_due
  from public.flashcards fc
  join public.concepts c on c.id=fc.concept_id
  left join lateral(select r.next_review_at from public.flashcard_reviews r where r.user_id=v_user_id and r.opposition_id=v_opposition_id and r.flashcard_id=fc.id order by r.reviewed_at desc,r.id desc limit 1) latest on true
  where fc.opposition_id=v_opposition_id and fc.active and c.active and c.study_unit_id=p_study_unit_id and (latest.next_review_at is null or latest.next_review_at<=now());

  select count(*)::integer into v_ready
  from public.concepts c
  join public.user_concept_mastery m on m.user_id=v_user_id and m.opposition_id=v_opposition_id and m.concept_id=c.id
  where c.study_unit_id=p_study_unit_id and c.active and m.state in ('seen','verifying')
    and (select count(*) from public.question_concepts qc join public.questions q on q.id=qc.question_id where qc.concept_id=c.id and qc.role='primary' and q.activa)>=4;

  return jsonb_build_object('studyUnitId',p_study_unit_id,'completedAt',v_completed,'completionCount',v_count,'dueFlashcards',v_due,'conceptsReadyForVerification',v_ready,'nextStep',case when v_due>0 then 'flashcards' when v_ready>0 then 'verify' else 'done' end);
end;
$function$;

revoke execute on function private.open_my_v4_study_unit(uuid) from public,anon;
revoke execute on function private.complete_my_v4_study_unit(uuid) from public,anon;
grant execute on function private.open_my_v4_study_unit(uuid) to authenticated;
grant execute on function private.complete_my_v4_study_unit(uuid) to authenticated;
