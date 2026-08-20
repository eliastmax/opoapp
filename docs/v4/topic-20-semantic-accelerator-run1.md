# Tema 20 — Semantic Accelerator real benchmark · RUN 1

## Scope

This is the first real-topic benchmark after CONTENT-FACTORY.4. It intentionally measures Semantic Accelerator before any human repair of its provider proposal.

Flow exercised:

`real active V2 bank + canonical Temario_new.pdf traceability -> buildSemanticTopicDraft() -> runContentFactoryTopicWithSemanticDraft() -> FAST PIPELINE RUN 1 -> Governance Packet`

No Topic 20 V4 content existed before the run. No production import, Supabase write, migration, UI, mastery or paywall change is part of this benchmark.

## Canonical-source policy

Only `Temario_new.pdf` is allowed as substantive source. The real active bank references that document on every row and spans pages 44–76.

The repository benchmark does not ingest PDF bytes. The technical source adapter therefore creates article/page `SemanticSourceSpan` records only from the canonical traceability already present in the real V2 rows. It does **not** author legal prose, units, concept boundaries or mappings.

A reliable canonical PDF body-text representation was not available to the runner for downstream study-content/question generation. No BOE, web, academy, auxiliary PDF or model legal knowledge was substituted.

## Real input audit

Topic identity:

- opposition: `auxiliar-administrativo-sms`;
- Topic 20 id: `fca6abfc-343f-4e1b-9c83-65668ba1f8ba`;
- active questions: **220** (`SMS-T20-0001`–`SMS-T20-0220`);
- existing V4 before benchmark: **0 units / 0 concepts / 0 primary mappings / 0 flashcards**.

The full V2 25-field contract was audited read-only in Supabase before creating the benchmark snapshot:

- 220 distinct codes;
- 220 distinct stems;
- 0 invalid answer keys;
- 0 duplicate options;
- 0 invalid difficulty/pedagogical enums;
- 0 invalid page ranges;
- 0 incomplete semantic/source fields;
- 220/220 `documento_referencia = Temario_new.pdf`;
- pages entirely inside 44–76.

Only the `FactoryQuestionMetadata` fields actually consumed by Semantic Accelerator are versioned in the benchmark consumer. This avoids turning the test fixture into an unnecessary second copy of the complete question bank.

## Benchmark metrics A–K

| Metric | Result |
| --- | ---: |
| A. Units proposed automatically | **7** |
| A2. Units high-confidence | **7** |
| B. Concepts proposed automatically | **30** |
| C. Concepts high-confidence | **1** |
| D. Automatic high-confidence mappings | **32** |
| E. Doubtful mappings | **188 medium / 0 low** |
| F. Governance decisions represented by RUN 1 exception queue | **251 exceptions; 222 blockers** |
| G. New questions generated | **0**; 6 legitimate generation slots remain |
| H. Generated-question QA flags | **0** because no generated candidates were materialized |
| I. Source issues detected by Semantic Builder | **0** |
| J. Source-limited candidates | **0** |
| K. Manual interventions outside Factory | **3**, all non-semantic |

Additional coverage result:

- 27 standard-ready concepts;
- 3 actionable-gap concepts;
- 6 actionable missing questions;
- 0 source-limited;
- 0 source-review-required coverage concepts;
- 0 unmapped active questions;
- 0 multiple-primary questions.

Readiness is `blocked`; `importReady=false`.

## Semantic draft result before repair

Semantic Accelerator produced the full structural provider without caller-authored provider arrays:

- 7 units;
- 30 concepts;
- 220 primary mappings.

Confidence distribution is the central real-benchmark finding:

- units: 7/7 high;
- concepts: 1/30 high;
- mappings: 32/220 high, 188/220 medium, 0 low;
- semantic mapping candidate ties: 0;
- anchor conflicts: 0;
- source issues: 0;
- semantic blockers emitted by the builder itself: 0.

Therefore manual provider construction has been removed, but exception selectivity is not yet sufficient for the target workflow: Fast Pipeline's generic confidence policy promotes nearly every medium concept/mapping to Governance review.

## Complete exception queue

The complete Governance queue has **251** unique exceptions: **222 blockers + 29 non-blocking warnings**. The queue is fully reproducible from the benchmark test and is represented below by exact membership groups rather than repeating identical boilerplate 188 times.

### 1. Semantic concept-boundary warnings — 29, non-blocking

Exception form:

`fx:concept_boundary:concept:<CONCEPT>:mixed-signals`

Exact concepts:

`SMS-T20-C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C14, C15, C16, C17, C18, C19, C20, C21, C22, C23, C24, C25, C26, C27, C28, C29, C30`.

Reason pattern: materially different V2 labels/objectives are grouped despite shared source scope.

Recommendation pattern: review only whether that cluster should split; keep the provisional boundary until decided.

### 2. Medium concept-confidence blockers — 29

Exception form:

`fx:concept_boundary:concept:<CONCEPT>:confidence`

Exact concepts:

`SMS-T20-C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C14, C15, C16, C17, C18, C19, C20, C21, C22, C23, C24, C25, C26, C27, C29, C30`.

`SMS-T20-C28` is the sole high-confidence concept and therefore is not in this blocker group.

### 3. Medium mapping-confidence blockers — 188

Exception form:

`fx:mapping_ambiguity:mapping:<QUESTION>:confidence`

These are **not** semantic candidate ties (`mappingAmbiguities=0`). They are Fast Pipeline blockers caused solely by the mapping's `medium` confidence.

Exact membership by proposed primary concept:

- `C02`: 0003, 0004, 0005, 0006, 0174, 0175
- `C03`: 0007, 0051, 0052, 0053, 0149, 0151, 0166
- `C04`: 0008, 0009, 0010, 0152, 0177
- `C05`: 0012, 0013, 0054, 0150, 0168, 0178
- `C06`: 0055, 0056, 0179
- `C07`: 0057, 0153, 0180
- `C08`: 0016, 0017, 0018, 0181, 0182
- `C09`: 0019, 0020, 0059, 0060, 0061, 0101, 0102, 0103, 0104, 0105, 0183, 0184
- `C10`: 0023, 0106, 0107, 0154
- `C11`: 0024, 0025, 0062, 0063, 0108, 0109, 0155, 0169, 0187, 0189
- `C12`: 0065, 0156, 0190
- `C13`: 0066, 0067, 0110, 0111, 0191
- `C14`: 0068, 0069, 0070, 0192
- `C15`: 0026, 0071, 0072, 0112
- `C16`: 0027, 0113, 0159, 0194
- `C17`: 0028, 0029, 0030, 0031, 0032, 0114, 0115, 0116, 0117, 0119, 0120, 0160, 0195, 0196, 0197, 0198, 0199, 0200
- `C18`: 0073, 0121, 0122, 0123, 0171, 0201, 0202
- `C19`: 0034, 0074, 0075, 0076, 0077, 0078, 0124, 0125, 0126, 0127, 0128, 0129, 0130, 0131, 0132, 0203, 0204, 0206, 0208
- `C20`: 0080, 0161, 0207
- `C21`: 0035, 0082, 0083, 0136, 0162, 0209, 0210
- `C22`: 0081, 0133, 0134
- `C23`: 0036, 0037, 0038, 0084, 0085, 0086, 0087, 0173, 0211, 0212
- `C24`: 0039, 0040, 0089
- `C25`: 0041, 0043, 0044, 0090, 0091, 0092, 0093, 0094, 0163, 0172, 0214, 0215
- `C26`: 0045, 0046, 0138, 0139, 0140, 0141, 0216
- `C27`: 0047, 0096, 0097, 0142, 0143, 0144, 0217
- `C28`: 0098
- `C29`: 0048, 0049, 0050, 0099, 0145, 0146, 0148, 0219
- `C30`: 0100, 0165

Every numeric code above expands to `SMS-T20-NNNN`.

### 4. Coverage blockers — 3

1. `fx:coverage_anomaly:concept:sms-t20-c01:actionable-gap` — C01 has 3 actionable missing primary questions.
2. `fx:coverage_anomaly:concept:sms-t20-c28:actionable-gap` — C28 has 2 actionable missing primary questions.
3. `fx:coverage_anomaly:concept:sms-t20-c30:actionable-gap` — C30 has 1 actionable missing primary question.

Total legitimate generation slots: **6**.

### 5. Downstream technical blockers — 2

1. `fx:coverage_anomaly:topic:auxiliar-administrativo-sms-t20:missing-question-generator`
2. `fx:coverage_anomaly:topic:auxiliar-administrativo-sms-t20:missing-study-content`

These remain because the current benchmark input does not carry canonical PDF body text into executable downstream operations and the caller did not substitute any external source.

Queue arithmetic:

- 29 semantic boundary warnings;
- 29 concept-confidence blockers;
- 188 mapping-confidence blockers;
- 3 coverage blockers;
- 2 technical blockers;
- **251 total / 222 blockers**.

## Source-limited review

No concept was proposed as `source_limited`. No source ceiling was materialized or inferred from question count. Therefore RUN 1 has **zero source-limited candidates requiring Governance decision**.

## Downstream provisional generation

RUN 1 reaches provisional generation, adversarial QA, exception classification and Governance Packet. It does not stop at Gate 1.

However, with the canonical body text absent from the structured source spans and no source-grounded `buildStudyContent` / `generateQuestions` operations supplied:

- study content: not materialized;
- flashcards: not materialized;
- generated questions: 0;
- six generation slots remain;
- V4 portable package: not materialized;
- generated-question QA: valid empty candidate set, 0 issues.

This is recorded as a benchmark limitation rather than repaired manually from an auxiliary source.

## Manual interventions outside Factory

Exactly three interventions are recorded:

1. **T20-MANUAL-01 · A · technical input preparation** — read-only extraction and 25-field V2 audit from Supabase; only Semantic Accelerator's consumed metadata fields are versioned. No semantic decision.
2. **T20-MANUAL-02 · A · technical input preparation** — article/page source-span construction from canonical V2 traceability because CONTENT-FACTORY.4 does not ingest PDF bytes. No authored unit/concept/mapping boundary.
3. **T20-MANUAL-03 · C · downstream attempt** — attempted to continue study/question materialization; stopped because the structured input lacked canonical PDF body text and Factory exposes no PDF-text ingest/generator operation. No external source was substituted and no semantic artifact was manually fabricated.

Manual provider construction performed: **0 units / 0 concepts / 0 mappings**.

## Benchmark conclusion

The real benchmark validates one major success and two remaining bottlenecks:

1. **Success:** the worker no longer has to author the semantic provider before running Factory. Semantic Accelerator proposed all 7 units, 30 concepts and 220 mappings from real inputs.
2. **Remaining semantic bottleneck:** confidence/selectivity is too conservative for the exception-first target. Only 1/30 concepts and 32/220 mappings are high-confidence, producing an impractical Governance queue dominated by medium-confidence blockers.
3. **Remaining downstream bottleneck:** canonical PDF body-text ingestion and source-grounded study/question generator operations are not end-to-end in the current runner path, so RUN 1 cannot yet materialize study content or the six legitimate new questions without additional explicitly source-grounded work.

This document records RUN 1 only. No Governance decisions have been applied, no RUN 2 has been executed and Topic 20 is **not closed/import-ready**.
