-- Normalize legacy CSV "materia" labels for the Auxiliar Administrativo SMS bank.
-- Topic and question identifiers remain unchanged.

UPDATE public.subjects AS subject
SET nombre = 'Estatuto Marco del personal estatutario'
WHERE subject.nombre = 'Parte específica — Personal estatutario'
  AND EXISTS (
    SELECT 1
    FROM public.topics AS topic
    WHERE topic.user_id = subject.user_id
      AND topic.subject_id = subject.id
      AND topic.numero = 13
  );

UPDATE public.subjects AS subject
SET nombre = 'Situaciones administrativas, permisos y licencias'
WHERE subject.nombre = 'Parte específica'
  AND EXISTS (
    SELECT 1
    FROM public.topics AS topic
    WHERE topic.user_id = subject.user_id
      AND topic.subject_id = subject.id
      AND topic.numero = 14
  );

UPDATE public.subjects AS subject
SET nombre = 'Ley 39/2015 — Procedimiento administrativo común'
WHERE subject.nombre = 'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas'
  AND EXISTS (
    SELECT 1
    FROM public.topics AS topic
    WHERE topic.user_id = subject.user_id
      AND topic.subject_id = subject.id
      AND topic.numero = 19
  );

UPDATE public.subjects AS subject
SET nombre = 'Ley 40/2015 — Régimen jurídico del sector público'
WHERE subject.nombre = 'Régimen jurídico del sector público'
  AND EXISTS (
    SELECT 1
    FROM public.topics AS topic
    WHERE topic.user_id = subject.user_id
      AND topic.subject_id = subject.id
      AND topic.numero IN (20, 21)
  );
