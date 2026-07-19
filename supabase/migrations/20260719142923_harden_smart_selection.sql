-- Keep selection traces outside anonymous Data API access. RLS remains defence in depth.
REVOKE ALL ON public.test_question_selection FROM PUBLIC;
REVOKE ALL ON public.test_question_selection FROM anon;
GRANT SELECT, INSERT ON public.test_question_selection TO authenticated;
GRANT ALL ON public.test_question_selection TO service_role;
