-- RLS does not protect TRUNCATE; keep direct authenticated access read-only.
revoke all privileges on table public.v4_daily_sessions from authenticated;
revoke all privileges on table public.v4_daily_session_blocks from authenticated;
grant select on table public.v4_daily_sessions to authenticated;
grant select on table public.v4_daily_session_blocks to authenticated;
