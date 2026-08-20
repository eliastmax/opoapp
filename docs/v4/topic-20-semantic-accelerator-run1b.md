# Tema 20 — Semantic Accelerator · RUN 1B final

## Scope

Final RUN 1B retry after CONTENT-FACTORY.5. This run starts from the canonical intermediate representation supplied from `Temario_new.pdf` and does not rebuild source spans, units, concepts or mappings manually.

Flow exercised:

`CanonicalPageText[] -> SemanticSourceSpan[] -> buildSemanticTopicDraft() -> runContentFactoryTopicWithSemanticDraft() -> generation work packets -> agent packet execution -> reintegration -> adversarial QA -> final provisional coverage -> Governance Packet`

This remains RUN 1 only. There are no production imports, Supabase writes, migrations, RUN 2, PR merge or Topic 21 work.

## Canonical input

- original document: `Temario_new.pdf`
- SHA-256: `96768192445fa7da87e09d265b0b578737d38ffca2559f22225ea49ac4cebe2a`
- PDF range: pages 41-77
- extracted pages: 37
- extracted text characters: 62,632
- extractor declared by supplied intermediate: `pdftotext -layout`
- network: false
- OCR: false

The only technical normalization before Factory was `page -> pageNumber` to match `CanonicalPageText`'s field name. No source span, semantic boundary or provider row was authored by the worker.

## Semantic result

Canonical ingest generated **38 SemanticSourceSpan records automatically** with real source text.

Semantic Accelerator then proposed, without manual map repair:

- units: **7**;
- concepts: **30** = 1 high / 29 medium / 0 low;
- primary mappings: **220** = 32 high / 188 medium / 0 low.

CONTENT-FACTORY.5 material-exception policy produced:

- confidence-only blockers: **0**;
- material concept-boundary exceptions: **0**;
- real mapping ambiguities: **0**;
- source issues: **0**;
- source-limited candidates: **0**;
- `missing-study-content`: **0**;
- `missing-question-generator`: **0**.

Qualitative confidence has deliberately not been inflated: the 1/29/0 and 32/188/0 distributions are unchanged from the raw semantic proposal.

## Source-stage coverage and work packets

Before packet execution, the only remaining exceptions were the three legitimate coverage deficits:

- `SMS-T20-C01`: 3 question slots;
- `SMS-T20-C28`: 2 question slots;
- `SMS-T20-C30`: 1 question slot.

Factory emitted executable packets:

- study-content packets: **30**;
- flashcard packets: **30**;
- question-gap packets: **6**.

No additional slot was invented and no previous RUN1A gap count was assumed without recalculation.

## Materialized RUN 1B output

The agent executed only the Factory work packets, using the canonical text contained in those packets:

- study units materialized: **7**;
- concepts represented in study content: **30**;
- flashcards: **60** (2 per concept);
- generated questions: **6**;
- generated codes: `SMS-T20-0221` through `SMS-T20-0226`;
- every generated question has the complete V2 25-field contract;
- every generated question was born with its `conceptCode`;
- every generated question cites `Temario_new.pdf` with canonical pages.

Final provisional coverage after reintegration:

- ready concepts: **30/30**;
- actionable-gap concepts: **0**;
- actionable missing questions: **0**;
- source-review-required concepts: **0**;
- source-limited concepts: **0**;
- unmapped questions: **0**;
- multiple-primary questions: **0**.

## Duplicate / near-duplicate QA

The six generated stems were compared read-only against all **220 active Topic 20 questions** using the same normalized token-set Jaccard family used by Factory.

Maximum similarity to an existing active question:

- 0221 -> 0074: 0.261
- 0222 -> 0176: 0.235
- 0223 -> 0160: 0.227
- 0224 -> 0098: 0.360
- 0225 -> 0100: 0.231
- 0226 -> 0096: 0.214

Factory near-duplicate threshold: 0.85. Therefore there are **0 exact duplicates and 0 near-duplicates** against the full active bank.

## Adversarial QA and final exception queue

All six generated rows pass the real V2 parser:

- parser-valid rows: **6/6**;
- QA errors: **0**;
- QA warnings: **1**.

The single remaining material exception is intentionally preserved for Governance:

- id: `fx:weak_distractor:question:sms-t20-0222:gross_length_clue`
- type: `weak_distractor`
- blocker: true
- subject: `SMS-T20-0222`
- reason: the correct option has a gross length contrast versus distractors and may leak the answer position.

No semantic map repair or confidence change was applied to make the queue green.

Final Governance queue:

- total exceptions: **1**;
- blockers: **1**;
- review-recommended non-blockers: **0**.

Readiness is `governance_required`, `importReady=false`, as expected for RUN 1 with one real Governance decision outstanding.

## Manual-intervention ledger

No semantic provider or map was manually constructed:

- provider manual: **0**;
- map manual: **0**;
- spans manual: **0**.

Recorded non-semantic/manual operations outside deterministic Factory:

1. `T20-MANUAL-01` · A — read-only V2 extraction/audit from Supabase; only Factory-consumed metadata enters the semantic fixture.
2. `T20-RUN1B-INPUT` · A — supplied canonical `CanonicalPageText[]`; technical field normalization `page -> pageNumber` only.
3. `T20-RUN1B-CONTENT` · C — agent execution of study-content and flashcard work packets using only packet canonical text.
4. `T20-RUN1B-QUESTIONS` · C — agent execution of the six recalculated question-gap packets and reintegration as complete V2 candidates.
5. `T20-RUN1B-QA` · C — read-only active-bank stem comparison for duplicate/near-duplicate QA.

All five interventions have `semanticDecision=false` with respect to the structural provider.

## RUN 1A -> RUN 1B

| Metric | RUN 1A | RUN 1B final |
| --- | ---: | ---: |
| Manual provider | 0 | 0 |
| Manual semantic spans | 30 technical spans | 0 |
| Automatic spans | 0 | 38 |
| Units | 7 | 7 |
| Concepts H/M/L | 1 / 29 / 0 | 1 / 29 / 0 |
| Mappings H/M/L | 32 / 188 / 0 | 32 / 188 / 0 |
| Confidence-only blockers | 217 | 0 |
| Material concept boundaries | 0 after Factory.5 material policy | 0 |
| Real mapping ambiguities | 0 | 0 |
| Technical missing-operation blockers | 2 | 0 |
| Study content materialized | 0 | 7 units / 30 concepts |
| Flashcards | 0 | 60 |
| New questions | 0 | 6 |
| Actionable missing questions | 6 | 0 |
| Total exceptions | 251 | 1 |
| Blockers | 222 | 1 |
| Review-recommended | 29 | 0 |

RUN 1B demonstrates that the systemic bottlenecks identified in RUN 1A are removed without relabeling medium confidence as high. The sole remaining blocker is a concrete question-level adversarial-QA decision, not confidence noise or missing pipeline infrastructure.

## Stop state

RUN 1B is complete and remains non-production. PR #74 must stay draft and unmerged. No RUN 2, production import or Topic 21 work is authorized by this audit pack.
