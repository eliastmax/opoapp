CREATE OR REPLACE FUNCTION private.create_v4_concept_check(
  p_concept_id uuid,
  p_question_count integer DEFAULT 2,
  p_mode text DEFAULT 'verify'
)
RETURNS TABLE(
  test_id uuid, selected_count integer, concept_id uuid, concept_code text, concept_title text,
  mode text, retention_checkpoint_days integer, novel_for_concept_count integer,
  reused_for_concept_count integer, previous_test_overlap_count integer, active_primary_questions integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
  v_is_source_limited boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(concept.source_capacity_status = 'source_limited', FALSE)
  INTO v_is_source_limited
  FROM public.concepts concept
  WHERE concept.id = p_concept_id
    AND concept.opposition_id = v_opposition_id
    AND concept.active IS TRUE;

  IF v_is_source_limited IS NULL THEN
    RAISE EXCEPTION 'Active concept not found in the current opposition' USING ERRCODE = '22023';
  END IF;

  IF v_is_source_limited THEN
    RETURN QUERY
      SELECT * FROM private.create_v4_source_limited_concept_check(
        p_concept_id,
        p_question_count,
        p_mode
      );
  ELSE
    RETURN QUERY
      SELECT * FROM private.create_v4_concept_check_standard(
        p_concept_id,
        p_question_count,
        p_mode
      );
  END IF;
END;
$$;
