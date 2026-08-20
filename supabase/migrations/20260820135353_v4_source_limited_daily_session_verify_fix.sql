CREATE OR REPLACE FUNCTION private.create_or_replace_my_v4_daily_session(
  p_local_date date,
  p_available_minutes integer,
  p_blocks jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
  v_session_id uuid;
  v_existing_status text;
  v_block jsonb;
  v_position integer := 0;
  v_kind text;
  v_label text;
  v_minutes integer;
  v_topic_id uuid;
  v_unit_id uuid;
  v_concept_id uuid;
  v_target_questions integer;
  v_checkpoint integer;
  v_reason_code text;
  v_reason text;
  v_planned_minutes integer := 0;
  v_before_state text;
  v_before_attention boolean;
  v_source_capacity_status text;
  v_source_supported_ceiling smallint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_available_minutes < 1 OR p_available_minutes > 120 THEN
    RAISE EXCEPTION 'Available minutes must be between 1 and 120' USING ERRCODE = '22023';
  END IF;

  IF p_local_date < current_date - 1 OR p_local_date > current_date + 1 THEN
    RAISE EXCEPTION 'Local date is outside the allowed window' USING ERRCODE = '22023';
  END IF;

  IF p_blocks IS NULL
     OR jsonb_typeof(p_blocks) <> 'array'
     OR jsonb_array_length(p_blocks) < 1
     OR jsonb_array_length(p_blocks) > 4 THEN
    RAISE EXCEPTION 'Daily session must contain between 1 and 4 blocks' USING ERRCODE = '22023';
  END IF;

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
  END IF;

  SELECT session.id, session.status
  INTO v_session_id, v_existing_status
  FROM public.v4_daily_sessions session
  WHERE session.user_id = v_user_id
    AND session.opposition_id = v_opposition_id
    AND session.local_date = p_local_date
  FOR UPDATE;

  IF v_session_id IS NOT NULL THEN
    IF v_existing_status <> 'active'
       OR EXISTS (
         SELECT 1
         FROM public.v4_daily_session_blocks block
         WHERE block.user_id = v_user_id
           AND block.session_id = v_session_id
           AND block.status <> 'planned'
       ) THEN
      RETURN v_session_id;
    END IF;

    DELETE FROM public.v4_daily_session_blocks block
    WHERE block.user_id = v_user_id
      AND block.session_id = v_session_id;

    UPDATE public.v4_daily_sessions session
    SET available_minutes = p_available_minutes,
        planned_minutes = 0,
        started_at = now(),
        updated_at = now()
    WHERE session.user_id = v_user_id
      AND session.id = v_session_id;
  ELSE
    INSERT INTO public.v4_daily_sessions (
      user_id,
      opposition_id,
      local_date,
      available_minutes,
      planned_minutes
    )
    VALUES (
      v_user_id,
      v_opposition_id,
      p_local_date,
      p_available_minutes,
      0
    )
    RETURNING id INTO v_session_id;
  END IF;

  FOR v_block IN SELECT value FROM jsonb_array_elements(p_blocks)
  LOOP
    v_position := v_position + 1;
    v_kind := v_block->>'kind';
    v_label := coalesce(nullif(v_block->>'label', ''), initcap(v_kind));
    v_minutes := coalesce((v_block->>'minutes')::integer, 0);
    v_topic_id := (v_block->>'topicId')::uuid;
    v_unit_id := (v_block->>'studyUnitId')::uuid;
    v_concept_id := nullif(v_block->>'conceptId', '')::uuid;
    v_target_questions := coalesce((v_block->>'targetQuestions')::integer, 0);
    v_checkpoint := nullif(v_block->>'retentionCheckpointDays', '')::integer;
    v_reason_code := coalesce(nullif(v_block->>'reasonCode', ''), 'unspecified');
    v_reason := coalesce(v_block->>'reason', '');
    v_source_capacity_status := NULL;
    v_source_supported_ceiling := NULL;

    IF v_kind NOT IN ('review', 'repair', 'advance', 'verify') THEN
      RAISE EXCEPTION 'Invalid daily block kind' USING ERRCODE = '22023';
    END IF;

    IF v_minutes < 1 OR v_minutes > 30 THEN
      RAISE EXCEPTION 'Invalid block minutes' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.study_units unit
      WHERE unit.id = v_unit_id
        AND unit.opposition_id = v_opposition_id
        AND unit.topic_id = v_topic_id
        AND unit.active
    ) THEN
      RAISE EXCEPTION 'Daily block study unit is invalid' USING ERRCODE = '22023';
    END IF;

    IF v_kind = 'advance' THEN
      IF v_concept_id IS NOT NULL OR v_target_questions <> 0 OR v_checkpoint IS NOT NULL THEN
        RAISE EXCEPTION 'Advance blocks cannot carry concept-check metadata' USING ERRCODE = '22023';
      END IF;
      v_before_state := NULL;
      v_before_attention := FALSE;
    ELSE
      IF v_concept_id IS NULL THEN
        RAISE EXCEPTION 'Concept block requires conceptId' USING ERRCODE = '22023';
      END IF;

      SELECT concept.source_capacity_status, concept.source_supported_ceiling
      INTO v_source_capacity_status, v_source_supported_ceiling
      FROM public.concepts concept
      WHERE concept.id = v_concept_id
        AND concept.opposition_id = v_opposition_id
        AND concept.topic_id = v_topic_id
        AND concept.study_unit_id = v_unit_id
        AND concept.active;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Daily block concept is invalid' USING ERRCODE = '22023';
      END IF;

      IF v_kind = 'review' AND (v_target_questions < 1 OR v_target_questions > 2) THEN
        RAISE EXCEPTION 'Invalid target question count for block kind' USING ERRCODE = '22023';
      END IF;

      IF v_kind = 'repair' AND (v_target_questions < 1 OR v_target_questions > 3) THEN
        RAISE EXCEPTION 'Invalid target question count for block kind' USING ERRCODE = '22023';
      END IF;

      IF v_kind = 'verify' THEN
        IF v_source_capacity_status IS NULL THEN
          IF v_target_questions < 2 OR v_target_questions > 4 THEN
            RAISE EXCEPTION 'Invalid target question count for block kind' USING ERRCODE = '22023';
          END IF;
        ELSIF v_source_capacity_status = 'source_limited' THEN
          IF v_source_supported_ceiling IS NULL
             OR v_source_supported_ceiling < 1
             OR v_source_supported_ceiling > 3
             OR v_target_questions <> v_source_supported_ceiling THEN
            RAISE EXCEPTION 'Invalid target question count for source-limited verify block' USING ERRCODE = '22023';
          END IF;
        ELSE
          RAISE EXCEPTION 'Invalid source capacity metadata for concept' USING ERRCODE = '22023';
        END IF;
      END IF;

      IF v_kind <> 'review' AND v_checkpoint IS NOT NULL THEN
        RAISE EXCEPTION 'Only review blocks may carry retention checkpoints' USING ERRCODE = '22023';
      END IF;

      IF v_checkpoint IS NOT NULL AND v_checkpoint NOT IN (3, 7, 14, 30) THEN
        RAISE EXCEPTION 'Invalid retention checkpoint' USING ERRCODE = '22023';
      END IF;

      PERFORM private.refresh_my_v4_concept_mastery(v_concept_id);

      SELECT mastery.state, mastery.needs_attention
      INTO v_before_state, v_before_attention
      FROM public.user_concept_mastery mastery
      WHERE mastery.user_id = v_user_id
        AND mastery.opposition_id = v_opposition_id
        AND mastery.concept_id = v_concept_id;
    END IF;

    v_planned_minutes := v_planned_minutes + v_minutes;
    IF v_planned_minutes > p_available_minutes THEN
      RAISE EXCEPTION 'Planned blocks exceed available minutes' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.v4_daily_session_blocks (
      user_id,
      opposition_id,
      session_id,
      position,
      kind,
      label,
      planned_minutes,
      topic_id,
      study_unit_id,
      concept_id,
      target_questions,
      retention_checkpoint_days,
      reason_code,
      reason,
      mastery_state_before,
      needs_attention_before
    )
    VALUES (
      v_user_id,
      v_opposition_id,
      v_session_id,
      v_position,
      v_kind,
      v_label,
      v_minutes,
      v_topic_id,
      v_unit_id,
      v_concept_id,
      v_target_questions,
      v_checkpoint,
      v_reason_code,
      v_reason,
      v_before_state,
      coalesce(v_before_attention, FALSE)
    );
  END LOOP;

  UPDATE public.v4_daily_sessions session
  SET planned_minutes = v_planned_minutes,
      updated_at = now()
  WHERE session.user_id = v_user_id
    AND session.id = v_session_id;

  RETURN v_session_id;
END;
$$;
