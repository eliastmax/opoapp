# V4 — OpoTest Content Factory

## Objetivo

Content Factory prepara, audita y empaqueta contenido V4/V2 sin escribir en producción.

Flujo objetivo tras CONTENT-FACTORY.4:

`fuente canónica + banco → Semantic Draft Builder → FAST PIPELINE RUN 1 → excepciones → Gobernanza → RUN 2 incremental → QA final → importReady`

Para SMS, `Temario_new.pdf` continúa siendo la **única fuente sustantiva**. La Factory no usa BOE, web, academias ni conocimiento jurídico externo para completar conceptos, preguntas, respuestas, distractores, explicaciones o cards.

Los importadores productivos siguen fuera de la Factory y detrás de la frontera explícita de producción.

---

# Arquitectura

`src/lib/content-factory/` mantiene piezas puras y versionables:

- `types.ts`: job, metadatos V2, conceptos, mappings, dimensiones y contenido;
- `analyze-existing-bank.ts`: análisis/clustering preliminar legacy;
- `semantic-draft.ts`: **Semantic Accelerator**;
- `semantic-fast-pipeline.ts`: entrada que fusiona excepciones semánticas en el mismo Governance Packet de Fast Pipeline;
- `coverage.ts`: coverage y QA de mappings;
- `generation-plan.ts`: slots dirigidos;
- `question-quality.ts`: QA adversarial;
- `package-builder.ts`: V2/V4 portable sin I/O;
- `exceptions.ts`: exception queue y Governance packet;
- `fast-pipeline-types.ts`: contratos Fast Pipeline;
- `fast-pipeline.ts`: `runContentFactoryTopic()` y RUN 2 incremental;
- `reports.ts` / `validators.ts`: informes y validación;
- `index.ts`: API pública.

Los drafts no necesitan persistencia Supabase.

---

# Semantic Accelerator

## API

```ts
const semantic = buildSemanticTopicDraft({
  job,
  canonicalSource,
  existingQuestions,
  approvedAnchors,
  existingV4,
  policy,
});
```

`canonicalSource` es una representación offline de la fuente mediante spans estructurados:

```ts
{
  id,
  document,
  reference,
  heading,
  sectionPath,
  article,
  text,
  pageStart,
  pageEnd,
}
```

El caller no tiene que escribir manualmente arrays de units/concepts/mappings para iniciar Fast Pipeline.

## Señales permitidas

El builder combina exclusivamente:

- estructura/títulos/apartados de la fuente canónica;
- artículos tal como aparecen en sus referencias;
- páginas/spans canónicos;
- `apartado` y `subapartado` V2;
- concepto V2;
- objetivo de aprendizaje V2;
- perspectiva/tipo de trampa V2;
- source/page metadata V2;
- anchors/V4 previos opcionales.

No intenta “entender derecho” desde conocimiento del modelo.

## Clustering

Primero propone units mediante convergencia de jerarquía de fuente y apartados V2. Dentro de cada unit agrupa conceptos cuando convergen señales independientes como:

- mismo concepto u objetivo;
- mismo subapartado + mismo scope canónico;
- fuerte similitud de labels/objetivos + evidencia fuente común.

Compartir un artículo no obliga por sí solo a fusionar conceptos. Una frase aislada tampoco crea automáticamente un microconcepto.

Las fronteras dudosas permanecen provisionales y se elevan como `concept_boundary`.

## Mappings

El mayor ahorro se concentra en mappings. Cada pregunta canónicamente elegible recibe un primary provisional cuando existe suficiente convergencia entre:

- concepto/objetivo V2;
- unit propuesta;
- span/página/artículo canónico;
- cluster semántico.

Empates o varios candidatos creíbles se convierten en `mapping_ambiguity`. La Factory no elige primary para conseguir coverage más bonito.

Una pregunta que cita explícitamente una fuente no canónica se excluye del mapping y produce `source_review_required`.

## Confidence

Cada propuesta tiene:

- `high`;
- `medium`;
- `low`;
- razón;
- evidence span ids/source refs;
- señales semánticas;
- preguntas afectadas.

No representa una probabilidad matemática ni genera porcentajes ficticios.

`high + QA verde` no requiere revisión individual. `medium` se eleva solo si puede cambiar materialmente estructura/mapping/contenido. `low` bloquea.

## Study scaffold

Semantic Accelerator no fabrica manuales jurídicos. Prepara inputs source-grounded por concepto:

- source spans;
- frases extractivas para summary;
- essential evidence;
- exam-key candidates;
- señales de traps V2;
- conceptos vecinos/confusables;
- flashcard seeds ligados a evidencia;
- generation dimensions.

El objetivo es que la siguiente etapa no tenga que volver a estructurar el tema desde cero.

## Exception-first

`SemanticDraftMetrics` expone:

- units high-confidence;
- concepts high-confidence;
- mappings automáticos;
- mappings dudosos;
- concept boundaries dudosas;
- source issues;
- total exceptions;
- blockers.

El detalle completo sigue disponible en el draft/audit pack; Gobernanza revisa primero solo las excepciones.

---

# Integración con Fast Pipeline

`SemanticTopicDraft.structuralDraft` es compatible directamente con Fast Pipeline.

```ts
const run1 = runContentFactoryTopicWithSemanticDraft({
  job,
  semanticDraft: semantic,
  operations: {
    buildStudyContent,
    generateQuestions,
    hardenQuestions,
  },
});
```

Esta entrada usa el runner normal y fusiona las excepciones semánticas en **la misma** `exceptionQueue`, Governance Packet y readiness. No existe una segunda bandeja de revisión.

El builder elimina la escritura manual del provider estructural. Las operaciones editoriales posteriores pueden usar `studyScaffolds` como material ya estructurado para generar contenido/cards/preguntas exclusivamente desde la fuente.

---

# Fast Pipeline

Gate 1 y Gate 2 siguen siendo garantías internas, pero no son microgates humanos rutinarios.

## RUN 1 — draft + exceptions

Cuando existen provider/operaciones suficientes, ejecuta:

1. ingest;
2. analyze;
3. structural draft;
4. provisional generation;
5. adversarial QA;
6. exception classification;
7. Governance packet.

Puede preparar provisionalmente coverage, source capacity, contenido, cards, preguntas, hardening, V2 y V4 aun con gates pendientes. Nada provisional cruza producción.

## Gobernanza — una revisión central

Revisa únicamente:

- blockers;
- low confidence;
- medium material;
- `source_review_required`;
- nuevos `source_limited`;
- concept boundaries relevantes;
- mappings híbridos;
- anchor conflicts;
- QA adversarial.

Los high-confidence verdes permanecen auditables pero no requieren aprobación elemento a elemento.

## RUN 2 — resolve + finalize

Consume `previousRun + decisions`, aplica decisiones por `exceptionId`, invalida solo el scope dependiente, regenera lo afectado, repite QA y actualiza `importReady`.

Una tercera ronda solo se justifica por inconsistencia real de fuente, bug técnico o una nueva decisión humana material.

---

# Exception queue

Tipos estables:

- `concept_boundary`;
- `mapping_ambiguity`;
- `source_limited_candidate`;
- `source_review_required`;
- `anchor_conflict`;
- `weak_distractor`;
- `near_duplicate`;
- `source_traceability`;
- `generation_dimension`;
- `coverage_anomaly`.

Cada excepción conserva id estable, blocker, severity, confidence, subject, explicación, recomendación, alternativas y `affectedArtifacts`.

---

# Hardening automático

Antes de producción las candidatas pasan por los contratos reales:

- 25 campos V2;
- parser real;
- cuatro opciones únicas;
- respuesta válida;
- balance A/B/C/D;
- canonical source;
- source/page completeness;
- duplicados/near-duplicates;
- pistas groseras de longitud;
- opciones todas/ninguna no deseadas;
- concept mapping;
- evidence dimensions y diversidad.

Las heurísticas señalan riesgo; no sustituyen revisión editorial.

---

# Source limited

Se conserva el contrato existente:

- `ready`;
- `coverage_gap`;
- `source_review_required`;
- `source_limited`.

El threshold global no se baja. Un `source_limited` nuevo exige decisión humana explícita y conserva ceiling, déficit nominal y déficit accionable. No se fabrican preguntas redundantes para alcanzar cuatro.

---

# Existing bank

Flujo preferente:

`canonical source + V2 → buildSemanticTopicDraft() → Fast Pipeline`

Los campos semánticos V2 y la trazabilidad canónica permiten que la mayoría de mappings claros nazcan automáticamente. Los casos dudosos se elevan, no se fuerzan.

---

# Greenfield

Sin banco, el builder deriva units de la jerarquía canónica y concept seeds de headings/artículos. La confianza conceptual es deliberadamente menor porque no hay evidencia de preguntas que confirme las fronteras.

Después Fast Pipeline puede generar contenido/cards/preguntas desde los scaffolds. Greenfield no comparte supuestos exclusivos de SMS.

---

# Goldens

T13, T18 y T19 son fixtures inmutables de regresión. Semantic Accelerator mide retrospectivamente:

- recuperación de units;
- recuperación de concepts;
- coincidencia semántica de mappings;
- excepciones/falsos positivos.

Los tests no modifican sus contenidos aprobados.

El replay demuestra reconstructabilidad determinista bajo las señales que el builder consume; no pretende afirmar que todos los snapshots históricos conservaran exactamente los mismos 25 campos V2. El siguiente tema real será el benchmark operativo de esa diferencia.

---

# Production safety boundary

Semantic Accelerator y Fast Pipeline son librería/offline workflow. No escriben producción.

`importReady` continúa requiriendo gates aprobados, ausencia de blockers, QA válido y paquetes reales. La ejecución de importadores productivos sigue siendo un paso separado y explícitamente autorizado.
