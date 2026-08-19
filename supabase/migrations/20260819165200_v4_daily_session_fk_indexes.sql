-- Cover V4 daily-session foreign keys for referential operations.
create index if not exists v4_daily_sessions_opposition_fk_idx
  on public.v4_daily_sessions(opposition_id);
create index if not exists v4_daily_session_blocks_opposition_fk_idx
  on public.v4_daily_session_blocks(opposition_id);
create index if not exists v4_daily_session_blocks_topic_fk_idx
  on public.v4_daily_session_blocks(topic_id);
create index if not exists v4_daily_session_blocks_unit_fk_idx
  on public.v4_daily_session_blocks(study_unit_id);
create index if not exists v4_daily_session_blocks_concept_fk_idx
  on public.v4_daily_session_blocks(concept_id)
  where concept_id is not null;
