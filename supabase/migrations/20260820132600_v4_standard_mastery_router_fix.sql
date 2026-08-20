CREATE OR REPLACE FUNCTION private.refresh_my_v4_concept_mastery(
  p_concept_id uuid DEFAULT NULL
)
RETURNS TABLE(
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
  v_source_concept_id uuid;
  v_is_source_limited boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '22023';
  END IF;

  IF p_concept_id IS NULL THEN
    PERFORM * FROM private.refresh_my_v4_concept_mastery_standard(NULL);

    FOR v_source_concept_id IN
      SELECT concept.id
      FROM public.concepts concept
      WHERE concept.opposition_id = v_opposition_id
        AND concept.active IS TRUE
        AND concept.source_capacity_status = 'source_limited'
    LOOP
      PERFORM private.refresh_source_limited_concept_mastery(v_source_concept_id);
    END LOOP;
  ELSE
    SELECT COALESCE(concept.source_capacity_status = 'source_limited', FALSE)
    INTO v_is_source_limited
    FROM public.concepts concept
    WHERE concept.id = p_concept_id
      AND concept.opposition_id = v_opposition_id
      AND concept.active IS TRUE;

    IF v_is_source_limited IS NULL THEN
      RAISE EXCEPTION 'Active concept not found in the current opposition' USING ERRCODE = '22023';
    ELSIF v_is_source_limited THEN
      PERFORM private.refresh_source_limited_concept_mastery(p_concept_id);
    ELSE
      PERFORM * FROM private.refresh_my_v4_concept_mastery_standard(p_concept_id);
    END IF;
  END IF;

  RETURN QUERY
  SELECT mastery.concept_id,
         mastery.state,
         mastery.needs_attention,
         mastery.next_review_on,
         mastery.reason_code,
         mastery.distinct_questions,
         mastery.safe_correct_questions,
         mastery.safe_accuracy,
         mastery.distinct_sessions,
         mastery.retention_checks_passed,
         mastery.last_evidence_at,
         mastery.evaluated_at
  FROM public.user_concept_mastery mastery
  JOIN public.concepts concept
    ON concept.id = mastery.concept_id
   AND concept.opposition_id = mastery.opposition_id
   AND concept.active IS TRUE
  WHERE mastery.user_id = v_user_id
    AND mastery.opposition_id = v_opposition_id
    AND (p_concept_id IS NULL OR mastery.concept_id = p_concept_id)
  ORDER BY concept.topic_id, concept.position, concept.code;
END;
$$;
