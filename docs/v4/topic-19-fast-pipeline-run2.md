# Tema 19 · FAST PIPELINE RUN 2 closure

Estado: **Governance approved / imported / smoke green / pending PR merge**.

## Governance decisions

- Gate 1: approved.
- Gate 2: approved.
- 15 study units, 40 concepts, 221 canonical existing mappings, 80 flashcards and `SMS-T19-0241..0245`: approved.
- `fx:source_review_required:topic:sms-t19-resource-source-boundary:legacy-resource-bank`: `accept_recommendation`.
- Legacy questions `0041-0049`, `0097-0100`, `0115-0120` preserve their records/history but are inactive and remain outside V4.

## RUN 2

`runContentFactoryTopic()` was executed from the reviewed RUN 1 state with the central Governance decisions.

Result:

- `runNumber = 2`.
- both editorial gates approved.
- grouped exception resolved.
- exception queue empty.
- `readiness.importReady = true`.
- `portable.importReady = true`.
- final factory coverage: 40 standard-ready concepts, 0 source-limited, 0 actionable gaps, 0 unmapped canonical questions and 0 multiple-primary.

## Productive materialization

- 19 legacy questions archived with `activa = false`; records/history retained.
- `import_questions_batch`: 5 inserted, 0 enriched, 0 omitted.
- Active T19 questions after import: 226.
- `import_v4_study_content`: 15 units / 40 concepts / 226 question mappings / 80 flashcards.
- V4 import id: `89bf4131-d116-4b50-b689-e81a7cb42ab8`.
- 0 mappings on the 19 archived legacy questions.
- 0 source-limited concepts in T19.
- 0 non-canonical source refs in active T19 units/cards.
- exactly one productive Topic 19 hierarchy row; no duplicate topic was created.

`import_questions_batch` resolves an existing topic using the exact topic name. RUN 1 used a concise editorial topic title, whereas the productive catalog keeps its official long title. RUN 2 therefore normalizes only `materia` and `tema` in the transport payload to the existing productive hierarchy. Every substantive V2 question field remains the approved value.

## Reversible smoke

### V2/V3

Transaction rolled back after verification:

- V2 smart test: 10 selected / 10 answer rows / 0 inactive / 0 legacy.
- V3 recommended test: 10 selected / 10 answer rows / 0 inactive / 0 legacy.

### V4

The first V4 smoke exposed a general router defect introduced by the source-limited routing layer: standard concepts have `source_capacity_status = NULL`, and direct comparison with `source_limited` returned SQL NULL, which the router mistook for a missing concept. The same defect existed in the mastery router.

Two minimal function-only migrations repair this without altering mastery thresholds, source-limited behavior, tables or content:

- `20260820133006_v4_standard_concept_check_router_fix.sql`.
- `20260820133300_v4_standard_mastery_router_fix.sql`.

Both use `COALESCE(concept.source_capacity_status = 'source_limited', FALSE)` for the standard/source-limited dispatch.

After those fixes, a reversible standard V4 verification on `SMS-T19-C18` returned:

- selected: 4;
- active primary questions: 7;
- novel for concept: 4;
- reused: 0;
- inactive selected: 0;
- legacy selected: 0;
- all 4 selected questions mapped primary to C18.

The smoke transaction was rolled back.

## Contamination and regressions

Read-only catalog recount after T19 materialization:

- T13: 144 active questions / 18 units / 34 concepts / 144 active primary mappings / 68 cards / 0 capacity concepts.
- T18: 260 active questions / 16 units / 44 concepts / 260 active primary mappings / 93 cards / 1 capacity concept.
- T19: 226 active questions / 15 units / 40 concepts / 226 active primary mappings / 80 cards / 0 capacity concepts.

T13 and T18 golden tests remain part of Quality. No T13/T18 content writes were executed in this RUN 2.

## Advisors

Post-materialization/post-router-fix advisors show no new sprint-attributable regression:

- Security: only the pre-existing `Leaked Password Protection Disabled` warning.
- Performance: existing informational unindexed-FK / unused-index notices; the function-only router fixes introduce no new table/index finding.

## Zero-impact aborted attempts

The following attempts produced no partial productive state:

1. Initial archive/import transaction was rejected by the active-opposition trigger because auth context was set after the first update; transaction rolled back.
2. Initial V4 JSON SQL builder was rejected before calling the import RPC because of a nested aggregate; transaction rolled back.
3. Initial V2 smart smoke supplied null difficulties; transaction rolled back.
4. Initial V4 smokes exposed the two standard-router NULL dispatch defects; smoke transactions rolled back.

The productive state was recounted after the successful writes and matches the approved target.
