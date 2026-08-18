-- Stable portable identifiers for V4 flashcards.
-- The table is empty when this migration is introduced, so the new code can be
-- required immediately without any backfill ambiguity.
ALTER TABLE public.flashcards
  ADD COLUMN code text NOT NULL CHECK (btrim(code) <> ''),
  ADD CONSTRAINT flashcards_opposition_code_key UNIQUE (opposition_id, code);
