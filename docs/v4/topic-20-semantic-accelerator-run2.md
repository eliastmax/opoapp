# Tema 20 — Semantic Accelerator · RUN 2 final

## Governance decision

RUN 1B was approved with a single material exception:

`fx:weak_distractor:question:sms-t20-0222:gross_length_clue`

Governance resolved it as **TARGETED REGENERATION**. No unit, concept, mapping, flashcard, source span, concept code, question code, generation dimension, objective or canonical source was changed.

`SMS-T20-0222` keeps:

- code `SMS-T20-0222`;
- concept `SMS-T20-C01`;
- dimension `exception`;
- the RUN 1B objective and stem;
- `Temario_new.pdf` as canonical source;
- arts. 1–2, pages 44–45;
- correct conceptual answer D.

Only A/B/C/D were regenerated to remove the gross length clue. The approved D is:

> La composición y categorías integrantes del sector público institucional.

## RUN 2 execution

The Governance `patch` decision was applied through the normal decision contract. Because this is a stable-code question-wording regeneration, the patched reviewed RUN 1B state was then validated through `runContentFactoryTopicWithSemanticDraft(...)` as RUN 2, rather than rebuilding C01 and allocating replacement codes after `0226`.

Final RUN 2:

- run number: 2;
- units: 7;
- concepts: 30;
- generated questions: 6 (`SMS-T20-0221`–`SMS-T20-0226`);
- total primary mappings: 226;
- flashcards: 60;
- concept map gate: approved;
- editorial quality gate: approved;
- final exceptions: 0;
- blockers: 0;
- `importReady=true`.

The other five generated question artifacts are unchanged from RUN 1B.

## QA

`SMS-T20-0222` and the complete six-question generated batch pass:

- V2 25-field parser: 6/6 valid;
- canonical source traceability: green;
- exact duplicate QA: green;
- near-duplicate QA: green;
- answer-balance QA: green;
- adversarial QA: 0 issues;
- mapping QA: 0 unmapped / 0 multiple-primary.

RUN 2 code validation completed successfully in GitHub Quality #261: 335 tests, 0 failures, `tsc --noEmit` green, client/SSR/Nitro build green. T13/T18/T19 regressions remained green.

## Production import

Production import was authorized only after RUN 2 reached zero exceptions and `importReady=true`.

Import order:

1. `import_questions_batch(...)` inserted exactly six new V2 rows: `SMS-T20-0221`–`SMS-T20-0226`;
2. `import_v4_study_content(...)` imported the exact RUN 2 V4 package.

The 220 pre-existing T20 questions preserved identity and were neither duplicated nor deleted.

V4 importer result:

- units: 7;
- concepts: 30;
- question mappings: 226;
- flashcards: 60.

Post-import production cardinalities:

- active T20 questions: 226;
- distinct active T20 codes: 226;
- active units: 7;
- active concepts: 30;
- active primary mappings: 226;
- active flashcards: 60;
- standard-ready concepts: 30/30;
- actionable gaps: 0;
- source-review-required: 0;
- source-limited: 0;
- unmapped: 0;
- multiple-primary: 0.

## Post-import smoke

All mutating smoke checks were executed inside transactions that ended in `ROLLBACK`.

V4:

- `prepare_my_v4_today_context()` exposes all 30 T20 concepts;
- minimum active primary questions across those concepts: 4;
- minimum active flashcards per concept: 2;
- after simulating the normal initial study transition for U01, `create_v4_concept_check(C01, 4, 'verify')` selected 4/4 questions;
- a standard V4 daily verify block for C01 was accepted with 10 planned minutes.

V2/V3:

- `create_level_test(T20, 'aprendizaje', 10, ...)` selected 10 questions;
- `get_initial_recommendation_context()` executed successfully;
- `get_weekly_roadmap()` executed successfully.

Contamination baseline outside T20 before import:

- active questions: 4,139;
- active units: 49;
- active concepts: 118;
- active primary mappings: 630;
- active flashcards: 241.

Post-import the five counters are identical, so cross-topic contamination is 0.

## Historical benchmark trace

| Metric | RUN 1A | RUN 1B | RUN 2 |
| --- | ---: | ---: | ---: |
| Units | 7 | 7 | 7 |
| Concepts H/M/L | 1/29/0 | 1/29/0 | 1/29/0 |
| Existing mapping H/M/L | 32/188/0 | 32/188/0 | 32/188/0 |
| Manual provider | 0 | 0 | 0 |
| Manual semantic spans | 30 technical | 0 | 0 |
| Confidence-only blockers | 217 | 0 | 0 |
| Material concept boundaries | — | 0 | 0 |
| Real mapping ambiguities | 0 | 0 | 0 |
| Study content | 0 | 7 units / 30 concepts | unchanged |
| Flashcards | 0 | 60 | 60 |
| New questions | 0 | 6 | 6 |
| Standard ready | 27/30 | 30/30 | 30/30 |
| Total exceptions | 251 | 1 | 0 |
| Blockers | 222 | 1 | 0 |
| importReady | false | false | true |

RUN 1A and RUN 1B remain preserved as historical benchmark stages. RUN 2 is the final approved production state for Tema 20.
