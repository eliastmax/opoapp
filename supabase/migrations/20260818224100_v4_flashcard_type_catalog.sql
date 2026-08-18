-- Keep database content aligned with the portable V4 package contract even if an
-- administrator calls the importer without the TypeScript validator.
ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_card_type_catalog_check
  CHECK (card_type IN ('direct', 'contrast', 'number_or_deadline', 'exception', 'mini_case'));
