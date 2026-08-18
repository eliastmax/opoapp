-- Keep privileged cache writes outside the exposed API schema. The public entry
-- point remains SECURITY INVOKER and accepts no client-computed mastery values.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.refresh_my_v4_concept_mastery(uuid) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.refresh_my_v4_concept_mastery(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.refresh_my_v4_concept_mastery(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_my_v4_concept_mastery(p_concept_id uuid DEFAULT NULL)
RETURNS TABLE (
  concept_id uuid,
  state text,
  needs_attention boolean,
  next_review_on date,
  reason_code text,
  distinct_questions integer,
  safe_correct_questions integer,
  safe_accuracy numeric,
  distinct_sessions integer,
  retention_checks_passed integer,
  last_evidence_at timestamptz,
  evaluated_at timestamptz
)
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM private.refresh_my_v4_concept_mastery(p_concept_id);
$$;

REVOKE ALL ON FUNCTION public.refresh_my_v4_concept_mastery(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_my_v4_concept_mastery(uuid) TO authenticated;

COMMENT ON FUNCTION private.refresh_my_v4_concept_mastery(uuid) IS
  'Privileged V4 mastery cache writer. Kept outside exposed schemas; derives all state from authenticated learner evidence.';
COMMENT ON FUNCTION public.refresh_my_v4_concept_mastery(uuid) IS
  'SECURITY INVOKER API wrapper for the private V4 mastery cache writer. The caller supplies only an optional concept filter, never mastery state or metrics.';
