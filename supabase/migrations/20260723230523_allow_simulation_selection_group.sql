-- Extend the closed trace catalog for the V2.5 exam simulation.

ALTER TABLE public.test_question_selection
  DROP CONSTRAINT IF EXISTS test_question_selection_selection_group_check;

ALTER TABLE public.test_question_selection
  ADD CONSTRAINT test_question_selection_selection_group_check
  CHECK (
    selection_group IN (
      'fallo_duda',
      'fallo',
      'duda',
      'nueva',
      'rendimiento_bajo',
      'repaso_programado',
      'retencion',
      'poco_vista',
      'variedad',
      'simulacro'
    )
  );
