# V4 — OpoTest Content Factory

## Objetivo

Content Factory prepara, audita y empaqueta contenido V4/V2 sin escribir en producción. `CONTENT-FACTORY.3` añade **Fast Pipeline**: Gate 1 y Gate 2 siguen existiendo como garantías internas y como frontera de `importReady`, pero dejan de obligar a detener el trabajo editorial en dos conversaciones humanas separadas.

Flujo objetivo:

`fuente + banco → RUN 1 completo → excepciones → Gobernanza → RUN 2 incremental → QA final → importReady`

Los importadores productivos continúan siendo exclusivamente:

- preguntas normales: `import_questions_batch(jsonb)`;
- contenido V4: `import_v4_study_content(jsonb)`.

Fast Pipeline **no llama a ninguno de ellos**.

---

## Arquitectura

`src/lib/content-factory/` contiene piezas puras y reutilizables:

- `types.ts`: job, gates, metadatos V2, conceptos, mappings, candidatos y dimensiones de evidencia;
- `codes.ts`: códigos estables;
- `analyze-existing-bank.ts`: clustering preliminar del banco V2;
- `coverage.ts`: coverage y QA de mappings apoyado en el auditor V4 real;
- `generation-plan.ts`: slots exactos de generación, con scope opcional por concepto para regeneración dirigida;
- `question-quality.ts`: QA adversarial V2/canonical source/duplicados/distractores/dimensiones;
- `package-builder.ts`: handoff portable V2 + V4 sin I/O productivo;
- `exceptions.ts`: clasificación y render de exception queue / governance packet;
- `fast-pipeline-types.ts`: contratos Fast Pipeline;
- `fast-pipeline.ts`: runner `runContentFactoryTopic()` y aplicación de decisiones;
- `reports.ts`: informe detallado/audit pack de Gate 1;
- `validators.ts`: validación del job y garantías de gates;
- `index.ts`: API pública.

La Factory sigue siendo una librería/offline workflow. No necesita persistir drafts en Supabase.

---

# Fast Pipeline

## API principal

```ts
const run = runContentFactoryTopic({
  job,
  existingV4Content,
  approvedAnchors,
  draft,
  operations,
  previousRun,
  decisions,
});
```

El caller ejecuta **una sola operación de orquestación**. No tiene que encadenar manualmente clustering, coverage, generation plan, QA, package builder y reporting.

### Input conceptual

`job` conserva:

- oposición;
- tema;
- `mode: existing_bank | greenfield`;
- `codePrefix`;
- fuente/revisión;
- canonical source policy;
- preguntas existentes, si existen.

Fast Pipeline admite además:

- `existingV4Content`: V4 ya existente;
- `approvedAnchors`: artefactos aprobados que no deben cambiar silenciosamente;
- `draft`: mapa/contenido/candidatos ya preparados por el proveedor semántico;
- `operations`: callbacks semánticos que el runner invoca automáticamente;
- `previousRun + decisions`: RUN 2 incremental.

### Output

`FactoryFastPipelineRun` devuelve:

- draft completo;
- unidades;
- conceptos;
- mappings;
- coverage inicial/final;
- slots de generación;
- preguntas generadas/hardened;
- QA adversarial;
- V2 package;
- V4 package;
- exception queue;
- governance packet;
- decision trace;
- regeneration report;
- readiness/importReady.

---

## Fases internas

El runner representa explícitamente:

1. `ingest`
2. `analyze`
3. `structural_draft`
4. `provisional_generation`
5. `adversarial_qa`
6. `exception_classification`
7. `governance_packet`
8. `apply_decisions` — RUN 2
9. `targeted_regeneration` — RUN 2
10. `final_validation`
11. `import_ready`

Los nombres sirven para trazabilidad; no son gates humanos individuales.

---

# Provisional ≠ producción

Gate 1 pendiente ya no significa «dejar de trabajar».

Si existe un mapa provisional suficiente, Fast Pipeline puede continuar con:

- mappings;
- coverage;
- source-capacity;
- contenido de estudio;
- cards;
- slots;
- preguntas;
- hardening;
- V2;
- V4;
- QA;
- governance packet.

La salida se marca `provisional` y **no puede ser `importReady`** mientras:

- Gate 1 o Gate 2 no estén aprobados;
- exista una excepción blocker sin resolver;
- haya `source_review_required`;
- exista coverage accionable pendiente;
- QA estructural/canonical falle.

Cada excepción conserva `affectedArtifacts`, y `decisionTrace` expone:

- `provisional`;
- `confidence`;
- `reason`;
- objeto afectado;
- artefactos dependientes.

---

# Exception queue

Gobernanza no recibe por defecto un volcado de 40 conceptos + cientos de mappings + todas las preguntas. Recibe un resumen y **solo las excepciones**. El audit pack completo permanece disponible.

Tipos estables:

### A. `concept_boundary`
Split/merge/frontera conceptual incierta o propuesta con confianza insuficiente.

### B. `mapping_ambiguity`
Primary provisional o híbrido que necesita decisión específica.

### C. `source_limited_candidate`
La fuente parece haber alcanzado un techo independiente inferior al threshold nominal. Es revisión humana obligatoria antes de persistir `source_limited` nuevo.

### D. `source_review_required`
La fuente canónica no sostiene limpiamente la afirmación/decisión. Blocker. No se completa externamente.

### E. `anchor_conflict`
Un artefacto/mapping cambia respecto de un anchor aprobado.

### F. `weak_distractor`
Heurísticas de distractor/longitud/«todas-ninguna»/balance señalan posible respuesta por descarte.

### G. `near_duplicate`
Duplicado exacto o similitud alta dentro del lote o frente al banco existente.

### H. `source_traceability`
Documento/página/canonical source ausente o incoherente.

### I. `generation_dimension`
Preguntas sin dimensión o varias preguntas midiendo esencialmente la misma dimensión.

### J. `coverage_anomaly`
Gap residual tras generación, unmapped, multiple-primary, mapping inválido u otra inconsistencia estructural.

Cada `FactoryException` contiene:

```ts
{
  id,                 // estable y determinista
  type,
  blocker,
  severity,
  confidence,
  subject,
  explanation,
  recommendation,
  alternatives,
  affectedArtifacts
}
```

---

# Confidence

Se reutiliza una escala cualitativa:

- `high`: Factory considera que no hace falta una decisión humana específica si QA está verde;
- `medium`: mostrar como excepción cuando afecta fronteras, diagnóstico, mapping o contenido;
- `low`: revisión obligatoria/blocker.

No representa una probabilidad matemática. No se generan porcentajes artificiales.

Los artefactos V4 ya aprobados y usados como anchors se tratan como high-confidence **en cuanto a la decisión ya cerrada**; cualquier cambio contra ellos reaparece como `anchor_conflict`.

---

# Governance packet

Salida principal:

```text
Tema X
Banco existente: 240
Unidades: 16
Conceptos: 44
Standard ready: 39
Source-limited: 2
Preguntas nuevas: 15

Excepciones:
- 3 blockers
- 4 review recommended
- 36 conceptos high-confidence sin revisión específica
```

Después aparecen únicamente las excepciones estructuradas.

El objeto `auditPack` conserva:

- unidades;
- conceptos;
- assignments;
- preguntas generadas.

`renderFactoryGovernancePacketMarkdown()` permite entregar el packet en formato humano sin perder el objeto estructurado.

---

# Human review policy

No se aprueba manualmente cada elemento.

Por defecto:

`high confidence + QA verde → sin revisión específica`

Revisión central obligatoria para:

- low confidence;
- blockers;
- `source_review_required`;
- nuevos `source_limited`;
- concept boundaries relevantes;
- primary mappings ambiguos/híbridos;
- anchor conflicts;
- preguntas marcadas por QA adversarial;
- cualquier decisión que Factory no pueda resolver limpiamente desde la fuente canónica.

Gate 1 y Gate 2 continúan siendo approvals globales de producción, pero se pueden resolver en **la misma revisión central** junto con las excepciones.

---

# Governance decisions

RUN 2 consume un contrato reutilizable:

```ts
{
  gates: [
    { gate: "conceptMap", status: "approved" },
    { gate: "editorialQuality", status: "approved" }
  ],
  exceptions: [
    {
      exceptionId: "fx:mapping_ambiguity:mapping:q123:default",
      resolution: "patch",
      optionalPatch: { primaryConceptCode: "SMS-TXX-C05" }
    }
  ]
}
```

Resoluciones soportadas:

- `accept_recommendation`;
- `choose_alternative`;
- `patch`;
- `reject`.

La decisión se referencia por `exceptionId`; no obliga a editar manualmente muchos consumer files para aplicar cinco correcciones.

---

# Targeted regeneration / impact tracking

Una decisión no invalida todo el tema.

Ejemplo: `Q123 primary C04 → C05`.

Fast Pipeline invalida:

- mapping Q123;
- coverage C04/C05;
- generation slots C04/C05;
- preguntas generadas de esos conceptos cuando dejan de corresponder al déficit;
- QA/package/report derivados.

Conserva:

- unidades no relacionadas;
- conceptos no relacionados;
- cards de otros conceptos;
- preguntas generadas fuera del scope afectado.

`FactoryRegenerationReport` registra:

- decisiones aplicadas;
- conceptos afectados;
- artefactos invalidados;
- artefactos preservados;
- coverage conceptual recalculado;
- preguntas provisionales eliminadas;
- preguntas regeneradas.

El cálculo global de QA/mapping puede volver a ejecutarse como guard barato, pero la **regeneración semántica** se limita al scope afectado.

---

# Hardening automático

Antes de Gobernanza las candidatas pasan por `auditGeneratedQuestionCandidates()`:

- 25 campos V2;
- parseo V2 real;
- cuatro opciones únicas;
- clave A/B/C/D válida;
- balance de claves para lotes relevantes;
- canonical source;
- documento/referencia/páginas;
- stem duplicado;
- near duplicate dentro del lote;
- near duplicate contra banco existente;
- «todas/ninguna» no deseadas;
- pistas groseras de longitud;
- concept mapping;
- dimensión de evidencia;
- diversidad de dimensiones por concepto.

Las heurísticas de similitud/distractores generan señales de revisión; **no sustituyen criterio editorial**.

`operations.hardenQuestions()` permite que el proveedor semántico reconstruya automáticamente las candidatas sospechosas desde la fuente canónica antes del QA final. El runner llama esta operación; no pide un microgate humano.

---

# Canonical source policy

Para SMS la fuente sustantiva es:

`Temario_new.pdf`

En `canonicalOnly`:

- el job rechaza referencias externas nuevas;
- las preguntas generadas deben declarar `documento_referencia = Temario_new.pdf` y referencia canónica;
- unidades/conceptos/cards nuevos o modificados deben tener trazabilidad canónica y de página;
- BOE/web/academias/conocimiento externo no se usan para conceptos, respuestas, distractores, explicaciones, cards o correcciones.

Los golden anchors ya cerrados se tratan como artefactos inmutables: Fast Pipeline no reinterpreta ni reutiliza una eventual provenance legacy del anchor para generar contenido nuevo. Cualquier **nuevo o modificado** artefacto queda sometido a canonicalOnly.

---

# `source_limited`

Se mantiene el contrato de SOURCE-LIMITED MASTERY.1.

Factory distingue:

- `ready`;
- `coverage_gap`;
- `source_review_required`;
- `source_limited`.

Un `source_limited` completo conserva:

- threshold nominal;
- `sourceSupportedCeiling`;
- déficit nominal visible;
- `blockedAdditionalQuestions`;
- déficit accionable = 0.

`planDirectedQuestionGeneration()` solo genera para déficit **accionable**. Nunca fabrica preguntas para completar artificialmente el threshold global.

Un `source_limited` nuevo entra en la exception queue; uno ya aprobado y coincidente con un anchor real no genera una excepción falsa.

---

# Existing bank

Fast Pipeline puede arrancar de:

1. banco V2 + proveedor semántico;
2. banco V2 + draft provisional;
3. V4 ya existente/anchor.

Si no se proporciona mapa semántico, `proposePreliminaryConceptMap()` sigue disponible como primera pasada determinista. Sus seeds son low-confidence y se convierten en excepciones; no se canonizan silenciosamente.

Tema 13 y Tema 18 prueban el caso cerrado/anchored.

---

# Greenfield

Greenfield no depende de disponer primero de un banco V2.

Flujo:

`fuente → structural provider → conceptos → contenido/cards → coverage=0 → slots → preguntas → mappings → QA → V2/V4`

La librería pura no intenta «leer jurídicamente» un PDF por sí sola. Esa parte semántica entra por `operations.buildStructuralDraft`, `buildStudyContent`, `generateQuestions` y `hardenQuestions`, todas llamadas por **el mismo runner**.

Esto permite usar el mismo workflow en una oposición futura construida directamente como V4 sin crear una arquitectura exclusiva para SMS existente.

---

# RUN 1 / RUN 2

## RUN 1 — Draft + exceptions

Produce, cuando existe proveedor semántico:

- mapa provisional;
- mappings;
- coverage;
- source capacities;
- contenido;
- cards;
- preguntas faltantes;
- hardening;
- V2;
- V4;
- QA;
- exception queue;
- governance packet.

Gate 1/Gate 2 pueden seguir `pending`; eso bloquea producción, no el trabajo provisional.

## Gobernanza — una revisión central

Revisa:

- blockers;
- medium/low relevantes;
- nuevos source-limited;
- source-review-required;
- QA adversarial;
- conflictos de anchors.

No relee rutinariamente todos los high-confidence verdes.

## RUN 2 — Resolve + finalize

- aplica decisiones;
- invalida scope;
- regenera solo lo afectado;
- repite QA;
- actualiza packet/readiness;
- deja paquete listo para los importadores si gates y blockers están resueltos.

Una tercera ronda solo se justifica por inconsistencia real de fuente, bug técnico o una decisión humana nueva material.

---

# Golden fixtures

## Tema 13

Fast Pipeline debe reconocer el resultado cerrado sin falsas excepciones relevantes:

- 18 units;
- 34 concepts;
- 144 mappings;
- 68 cards;
- 34 standard ready;
- 0 actionable gaps.

## Tema 18

Debe reconocer:

- 16 units;
- 44 concepts;
- 260 mappings;
- 93 cards;
- 43 standard ready;
- 1 `source_limited` completo;
- 0 actionable gaps;
- C29 ceiling 1;
- `0239 → C30`;
- ningún intento de crear `0245/0246/0247`.

Los golden no se reescriben.

---

# Production safety boundary

Fast Pipeline nunca:

- llama importadores;
- escribe Supabase;
- modifica schema;
- rebaja mastery threshold;
- persiste `source_review_required`;
- convierte provisional en producción automáticamente.

`importReady` exige simultáneamente:

- job válido;
- Gate 1 aprobado;
- Gate 2 aprobado;
- QA V2 verde;
- V4 válido;
- 0 actionable coverage gaps;
- 0 source-review blockers;
- 0 exception blockers pendientes.

---

# Medición de ahorro de proceso

## Antes — procedimiento Tema 18

El flujo real requirió múltiples handoffs/interrupciones humanas:

- análisis y propuesta conceptual;
- revisión Gate 1;
- generación dirigida;
- revisión Gate 2;
- hardening separado;
- microgate de source-limited/mastery;
- autorización de materialización;
- cierre final.

Aunque Factory automatizaba conteos y coverage, Gobernanza tenía que reentrar varias veces y revisar artefactos completos en más de una ronda.

## Fast Pipeline — objetivo

Handoffs humanos rutinarios esperados: **2 checkpoints**:

1. **una revisión central** del governance packet de RUN 1;
2. **un cierre** tras RUN 2/QA final antes de materialización/merge conforme a Gobernanza.

Ya no debería ser necesario revisar manualmente en rondas separadas:

- todos los conceptos high-confidence;
- todos los mappings claros;
- coverage manual;
- cálculo de slots;
- balance de claves;
- V2 estructural;
- canonical source de candidatas;
- duplicados/near-duplicates básicos;
- hardening como microgate separado;
- Gate 1 y Gate 2 como conversaciones independientes cuando pueden aprobarse juntos.

La métrica no es «minutos estimados» sino reducción de **múltiples rondas → 1 revisión + 1 cierre**.
