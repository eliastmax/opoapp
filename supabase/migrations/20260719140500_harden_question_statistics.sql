-- Keep statistics outside anonymous API access. RLS remains defence in depth.
REVOKE ALL ON public.question_statistics FROM PUBLIC;
REVOKE ALL ON public.question_statistics FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.question_statistics TO authenticated;
GRANT ALL ON public.question_statistics TO service_role;
