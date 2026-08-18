# V4 — Modelo de datos del grafo de aprendizaje

## Auditoría de partida

Snapshot de producción auditado el 19/08/2026:

- 4.308 preguntas activas;
- 4.123 preguntas de Auxiliar Administrativo SMS;
- 24 temas SMS con preguntas;
- 633 subtemas con preguntas en el banco completo;
- 3.017 etiquetas de texto distintas en `questions.concepto`;
- 0 preguntas sin `concepto`, `objetivo_aprendizaje` o `apartado`.

Conclusión: el banco ya tiene metadato rico, pero `questions.concepto` no puede convertirse directamente en el concepto canónico de V4. En varios temas casi cada pregunta tiene una etiqueta distinta. V4 necesita una capa estable que agrupe preguntas relacionadas en conocimientos medibles.

## Jerarquía canónica

`Oposición → Tema → Unidad de estudio → Concepto`

Las tablas V4 son aditivas y no reemplazan `topics`, `subtopics`, `questions`, `tests` ni `test_answers`.

### `study_units`

Unidad breve de estudio, normalmente 3–10 minutos.

Contiene:

- código estable;
- título;
- orden;
- tiempo estimado;
- resumen;
- claves de examen;
- confusiones;
- trampas;
- mnemotecnias opcionales;
- referencias a fuente;
- estado activo/inactivo.

Puede guardar un `subtopic_id` como referencia de origen, pero un subtema actual no equivale necesariamente a una unidad V4. Algunos subtemas son demasiado amplios y otros demasiado pequeños.

### `concepts`

Unidad central de conocimiento de V4.

Cada concepto:

- pertenece a una sola unidad canónica;
- tiene código estable;
- pertenece a un tema y oposición concretos;
- puede ser enseñado por contenido y cards;
- puede ser medido por varias preguntas distintas.

Un concepto no debe definirse con una granularidad tan pequeña que solo exista una pregunta capaz de medirlo salvo que sea inevitable.

### `question_concepts`

Relación entre el banco existente y el mapa V4.

Cada pregunta puede tener:

- un concepto `primary` como máximo;
- cero o más conceptos `secondary`.

Regla inicial de atribución:

- respuestas históricas/ordinarias aportan evidencia fuerte al concepto primario;
- los secundarios sirven para diagnóstico y para comprobaciones dirigidas;
- si V4 selecciona explícitamente una pregunta para comprobar un concepto concreto, `test_question_selection.selection_concept_id` registra ese objetivo y esa respuesta puede atribuirse al concepto seleccionado.

Esto evita que una sola pregunta multiplique artificialmente la evidencia en varios conceptos.

### `flashcards`

Cada card pertenece a un concepto canónico.

Las cards ayudan a recuperar información, pero no bastan para declarar dominio.

### `study_unit_progress`

Registra exposición del usuario a una unidad:

- primera apertura;
- última apertura;
- finalización;
- número de finalizaciones.

Completar una unidad puede convertir conceptos no trabajados en `Visto`, nunca en `Consolidando` o `Retenido`.

### `flashcard_reviews`

Histórico inmutable de revisiones de cards.

Aporta evidencia ligera y señales de atención.

### `user_concept_mastery`

Cache reconstruible del estado actual del concepto por usuario.

No es la fuente original de evidencia. Sus fuentes son:

- `test_answers`;
- `test_question_selection`;
- `study_unit_progress`;
- `flashcard_reviews`.

Contiene estado, atención, siguiente repaso y métricas necesarias para planificar `Hoy` sin recalcular todo el historial en cada pantalla.

En la fase foundation los clientes autenticados solo pueden leer su propia fila. La escritura se conectará después al motor de evaluación V4.

## Retención dirigida

`test_question_selection` recibe dos campos opcionales:

- `selection_concept_id`;
- `retention_checkpoint_days`.

Los tests V2/V3 históricos quedan con ambos campos a NULL y siguen funcionando sin cambios.

Cuando V4 programe una comprobación a +3, +7, +14 o +30 días podrá registrar qué concepto estaba intentando medir. El FK obliga a que la pregunta esté realmente asociada a ese concepto.

## Granularidad y cobertura mínima

El prototipo de dominio exige 4 preguntas distintas para entrar en `Consolidando`.

Por tanto, la calidad del mapa conceptual debe auditar también la cobertura del banco.

Regla V4:

> Un concepto con menos de 4 preguntas primarias activas se considera con cobertura insuficiente para demostrar dominio completo.

No se rebajará silenciosamente el estándar para hacer que el indicador quede verde.

El Generador deberá:

1. agrupar preguntas existentes en conceptos canónicos;
2. contar preguntas primarias distintas por concepto;
3. marcar `coverage_gap` cuando haya menos de 4;
4. proponer nuevas preguntas offline para cubrir el hueco;
5. exigir validación antes de importar esas preguntas.

Con un banco de 4k+ preguntas, la estrategia preferida es diseñar conceptos con suficiente amplitud para disponer de varias formas razonables de examinarlos sin convertirlos en macrotemas genéricos.

## Estrategia para mapear las 4k+ preguntas

No se hará manualmente pregunta por pregunta desde cero.

El generador de mapeo utilizará como señales existentes:

- oposición;
- tema;
- subtema;
- apartado;
- `concepto` textual;
- `objetivo_aprendizaje`;
- `tipo_trampa`;
- fuente y páginas;
- texto de pregunta y explicación.

Proceso:

1. segmentar por tema/apartado;
2. proponer unidades de estudio;
3. agrupar semánticamente objetivos y etiquetas próximas;
4. proponer conceptos canónicos;
5. asignar un concepto primario y secundarios cuando proceda;
6. auditar cobertura mínima de 4 preguntas;
7. revisar humanamente el paquete;
8. importar solo el paquete validado.

## Piloto

Se mantiene el piloto inicial sobre 3 temas antes de mapear los 24 temas SMS.

Temas candidatos actuales: 13, 18 y 19.

La validación debe demostrar:

`pregunta → concepto correcto → unidad correcta → repaso/cards → nueva pregunta distinta → control diferido → cambio de estado`.

Solo después se escala el proceso al resto del banco.

## Seguridad

Contenido compartido (`study_units`, `concepts`, `question_concepts`, `flashcards`):

- solo usuarios autenticados de la oposición activa pueden leer;
- solo administradores de esa oposición pueden mutar.

Evidencia personal (`study_unit_progress`, `flashcard_reviews`, `user_concept_mastery`):

- siempre aislada por `auth.uid()` y oposición activa;
- el usuario no puede escribir directamente `user_concept_mastery` en la fase foundation.

Todas las nuevas tablas públicas llevan RLS y grants explícitos.