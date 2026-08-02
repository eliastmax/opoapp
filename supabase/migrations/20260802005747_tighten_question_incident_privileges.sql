-- Keep the question-incident API surface limited to the operations used by the client.
-- Supabase default privileges may grant table permissions directly to API roles,
-- so revoking only from PUBLIC is not sufficient.

REVOKE ALL ON TABLE public.question_incidents FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.question_incidents TO authenticated;
