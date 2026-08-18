-- Keep the optional source subtopic inside the same opposition as the study unit.
ALTER TABLE public.study_units
  DROP CONSTRAINT study_units_subtopic_id_fkey,
  ADD CONSTRAINT study_units_opposition_subtopic_fk
    FOREIGN KEY (opposition_id, subtopic_id)
    REFERENCES public.subtopics (opposition_id, id);
