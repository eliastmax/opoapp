create policy "question_statistics_delete_own"
on public.question_statistics
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.reset_learning_progress()
returns table(deleted_tests integer, deleted_statistics integer)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.question_statistics
  where user_id = v_user_id;
  get diagnostics deleted_statistics = row_count;

  delete from public.tests
  where user_id = v_user_id;
  get diagnostics deleted_tests = row_count;

  return next;
end;
$$;

revoke all on function public.reset_learning_progress() from public;
revoke all on function public.reset_learning_progress() from anon;
grant execute on function public.reset_learning_progress() to authenticated;
