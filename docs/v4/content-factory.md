# V4 — OpoTest Content Factory

## Objetivo

`CONTENT-FACTORY.1` convierte el aprendizaje del piloto completo del Tema 13 en una capa editorial reutilizable. La fábrica prepara y audita contenido; **no importa nada por sí sola** y no sustituye los dos gates humanos.

Flujo canónico:

`fuente → análisis → Gate 1 → generación → QA → Gate 2 → paquete V2/V4 → importadores existentes`

Los importadores siguen siendo los ya vigentes:

- preguntas normales: `import_questions_batch(jsonb)`;
- contenido V4: `import_v4_study_content(jsonb)`.

La fábrica no crea una vía simplificada de preguntas V4.

## Arquitectura

`src/lib/content-factory/` contiene piezas puras y reutilizables:

- `types.ts`: contratos de trabajo, gates, metadatos, candidatos y dimensiones de evidencia;
- `codes.ts`: códigos estables de unidad, concepto, card y preguntas;
- `analyze-existing-bank.ts`: clustering estructural preliminar del banco V2 y preasignaciones de baja confianza;
- `coverage.ts`: cobertura configurable y QA de mappings apoyado en el auditor V4 real;
- `generation-plan.ts`: calcula exactamente los slots de preguntas que faltan y hace nacer cada slot dentro de un `conceptCode`;
- `question-quality.ts`: QA de V2, opciones, claves, fuentes, páginas, duplicados, similitud y reparto A/B/C/D;
- `reports.ts`: objeto y Markdown de Gate 1;
- `validators.ts`: contrato de entrada y gates;
- `package-builder.ts`: handoff portable V2 + `V4StudyContentPackage`, sin escribir en base de datos;
- `index.ts`: API pública de la fábrica.

`v4-content-coverage.ts` admite ahora un umbral opcional, manteniendo por defecto el mínimo del modelo V4. Así Factory puede analizar un encargo más exigente sin desacoplarse del contrato vigente.

## Modo A — existing_bank

Entrada mínima:

- oposición y tema;
- `codePrefix`;
- fuente validada;
- metadatos de preguntas existentes.

La fábrica puede:

1. agrupar preliminarmente por `apartado/subapartado`;
2. conservar etiquetas `concepto` y `objetivo_aprendizaje` como señales;
3. proponer unidades y semillas conceptuales;
4. producir preasignaciones marcadas con confianza baja;
5. calcular primarias, gaps y `missing`;
6. detectar preguntas sin primary, primary duplicado y conceptos inválidos;
7. producir el informe de Gate 1.

La propuesta automática **no es el mapa canónico**. La propia salida lo marca como pendiente de Gate 1. Esto protege la lección central de Tema 13: precisión diagnóstica antes que cobertura artificial.

## Modo B — greenfield

`existingQuestions` es opcional y puede estar ausente.

Tras aprobar Gobernanza un mapa de unidades/conceptos, la cobertura parte honestamente de cero. `planDirectedQuestionGeneration()` crea exactamente los slots necesarios para el umbral y cada slot contiene desde el origen:

- código estable de pregunta;
- `conceptCode`;
- dimensión de evidencia;
- motivo de generación.

Las dimensiones disponibles incluyen regla, excepción, sujeto, efecto, plazo, dies a quo, interrupción, requisito, competencia, literalidad, contraste y mini-caso.

Así una futura oposición como Celador no necesita crear primero un banco masivo para mapearlo meses después.

## Gate 1 — mapa conceptual

Es obligatorio antes de generar contenido/preguntas definitivas.

`buildGate1Report()` produce, por concepto:

- código;
- unidad;
- título;
- códigos de preguntas primarias;
- `primaryCount`;
- `ready/coverage_gap`;
- `missing` exacto;
- posibles solapamientos de títulos;
- observaciones.

Y resume:

- preguntas activas;
- unidades y conceptos;
- media y mediana;
- porcentaje ready;
- gaps;
- sin asignar;
- múltiples primary;
- mappings inválidos;
- preguntas exactas necesarias.

`renderGate1ReportMarkdown()` genera una versión directamente legible por Gobernanza.

## Generación dirigida

`planDirectedQuestionGeneration()` solo crea slots donde existe `missing > 0`.

Ejemplos con umbral 4:

- 3 primarias → 1 slot;
- 2 → 2;
- 1 → 3;
- 0 → 4;
- 4+ → 0.

No se rellena un concepto que ya esté cubierto.

## QA de preguntas

`auditGeneratedQuestionCandidates()` reutiliza el contrato real V2:

- serializa las candidatas a las 25 columnas de `HEADERS_V2`;
- las pasa por `parseCsv()`;
- exige cuatro opciones distintas;
- clave A/B/C/D válida;
- `conceptCode` existente;
- al menos una dimensión declarada;
- documento, referencia y páginas válidas;
- enunciados normalizados únicos;
- candidatos casi duplicados mediante el mismo Jaccard ya usado por el importador;
- guard reutilizable de desequilibrio A/B/C/D.

Los casi duplicados se marcan como warning: no se pretende automatizar una decisión semántica que requiere revisión editorial.

## Gate 2 — calidad editorial

Antes de considerar una salida `importReady`, Gobernanza debe aprobar el Gate 2 tras revisar:

- fidelidad jurídica/técnica;
- literalidad sensible;
- excepciones;
- distractores;
- fuentes;
- ausencia de paráfrasis vacías.

El código no intenta sustituir esta revisión.

## Salida portable

`buildContentFactoryPortableOutput()` devuelve un objeto versionable con:

- job de fábrica;
- estado de gates;
- filas V2 de preguntas nuevas;
- `V4StudyContentPackage`;
- validación del job;
- validación de gates;
- QA de preguntas;
- validación V4 real;
- flag `importReady`.

La función no llama a Supabase. Los dos importadores actuales siguen siendo la única vía de materialización.

## Golden fixture — Tema 13

Tema 13 no se copia ni se modifica. El test de regresión consume directamente el paquete productivo cerrado `topic13EstatutoMarcoMaterializedPackage` y exige que Factory reconozca:

- 18 unidades;
- 34 conceptos;
- 144 mappings primarios;
- 68 flashcards;
- 144/144 preguntas mapeadas;
- 34/34 conceptos ready;
- 0 `coverage_gap`;
- 0 preguntas adicionales necesarias.

El fixture prueba la estructura, no intenta reconstruir automáticamente las decisiones editoriales ya aprobadas.

## Qué sigue siendo humano

1. Delimitación final de unidades/conceptos y sus fronteras.
2. Aprobación de solapamientos o splits.
3. Redacción/fidelidad del contenido de estudio.
4. Revisión jurídica/técnica de preguntas y flashcards.
5. Calidad semántica de distractores.
6. Aprobación antes de importación.

## Qué no hace Factory.1

- no modifica UI;
- no crea contenido de Tema 18;
- no crea contenido de Celador;
- no escribe en Supabase;
- no duplica importadores;
- no rebaja el mínimo V4 de cuatro primarias;
- no convierte automáticamente las etiquetas V2 en conceptos canónicos.
