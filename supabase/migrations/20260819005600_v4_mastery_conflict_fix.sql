-- PostgreSQL/PLpgSQL resolves output-parameter names inside the function body.
-- `concept_id` is both a RETURNS TABLE column and part of the cache PK, so the
-- original conflict inference is ambiguous at runtime. Use the named PK instead.
DO $$
DECLARE
  v_definition text;
  v_from text := 'ON CONFLICT (user_id, concept_id) DO UPDATE SET';
  v_to text := 'ON CONFLICT ON CONSTRAINT user_concept_mastery_pkey DO UPDATE SET';
BEGIN
  SELECT pg_get_functiondef('public.refresh_my_v4_concept_mastery(uuid)'::regprocedure)
  INTO v_definition;

  IF position(v_from IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Expected V4 mastery conflict target was not found';
  END IF;

  v_definition := replace(v_definition, v_from, v_to);
  EXECUTE v_definition;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_my_v4_concept_mastery(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_my_v4_concept_mastery(uuid) TO authenticated;
