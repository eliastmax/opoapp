# V4 — Content Factory · capacidad de evidencia de la fuente

## Objetivo

Content Factory distingue desde Gate 2.1 entre el umbral nominal de cobertura y la cantidad de evidencia realmente soportada por la fuente canónica. Esta clasificación es editorial y **no modifica el backend de mastery**.

## Estados

### `coverage_gap`

La fuente canónica permite construir más evidencia independiente y el concepto todavía no ha alcanzado esa evidencia disponible.

- Es trabajo editorial accionable.
- `planDirectedQuestionGeneration()` puede crear slots.
- Si existe un `sourceSupportedCeiling`, nunca genera por encima de ese techo.

### `source_review_required`

La fuente resulta ambigua o insuficiente para sostener de forma segura la afirmación que se pretende materializar.

- Requiere revisión humana de la fuente o del mapa.
- No autoriza completar desde fuentes externas cuando el job es `canonicalOnly`.
- No se generan slots mientras siga pendiente la revisión.

### `source_limited`

El concepto y la fuente están correctamente delimitados, pero la fuente canónica contiene menos dimensiones independientes que el umbral nominal general.

- No es trabajo editorial pendiente.
- No es una ambigüedad de fuente.
- `sourceSupportedCeiling` declara cuántas preguntas primarias independientes soporta realmente la fuente.
- Cuando `primaryQuestionCount === sourceSupportedCeiling`, el concepto queda `source_limited`.
- El déficit hasta `nominalThreshold` permanece visible como `blockedAdditionalQuestions`, pero no es generable.

Ejemplo con umbral nominal 4 y techo de fuente 1:

- `primaryQuestionCount = 1`
- `nominalThreshold = 4`
- `nominalMissingPrimaryQuestions = 3`
- `actionableMissingPrimaryQuestions = 0`
- `sourceSupportedCeiling = 1`
- `blockedAdditionalQuestions = 3`
- `status = source_limited`

## Regla de planificación

Factory conserva dos magnitudes distintas:

- **déficit nominal**: diferencia respecto del umbral general;
- **déficit accionable**: preguntas independientes que todavía pueden generarse legítimamente desde la fuente.

La generación dirigida usa únicamente el déficit accionable. Nunca debe crear paráfrasis para transformar un techo de fuente en cobertura aparente.

Si un concepto tiene techo 3 y solo posee 1 pregunta primaria, conserva temporalmente `coverage_gap` con 2 preguntas accionables y 1 slot nominal ya bloqueado por la fuente. Al alcanzar 3 primarias pasa a `source_limited`.

## Relación con mastery

`source_limited` no equivale a `retained`, no baja el threshold global y no autoriza considerar dominado un concepto por una sola respuesta correcta.

El modelo actual de mastery continúa sin cambios hasta una decisión específica de Gobernanza. Cualquier futura política deberá separar:

1. diversidad máxima de preguntas realmente disponible;
2. evidencia segura en sesiones distintas;
3. comprobaciones diferidas de retención;
4. apoyo de flashcards u otros formatos sin convertirlos por sí solos en prueba de dominio.

## Tema 18 — referencia del microgate

`SMS-T18-C29` (Ejecutividad) es el primer caso aprobado:

- fuente: `Temario_new.pdf`, artículo 38;
- primarias independientes soportadas: 1 (`SMS-T18-0199`);
- umbral nominal: 4;
- `sourceSupportedCeiling = 1`;
- 3 preguntas adicionales bloqueadas;
- códigos reservados no materializados: `SMS-T18-0245`, `SMS-T18-0246`, `SMS-T18-0247`.

La razón es editorial: el artículo 38 contiene una única regla sustantiva de ejecutividad. Crear tres preguntas más mediría repetidamente el mismo conocimiento en lugar de añadir evidencia independiente.
