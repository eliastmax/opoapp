# T21 · FAST PRODUCTION PASS · RUN 1

Base: `5834564cc222b4498bd6ffa5633f9190ec9145ff`

Canonical source only: `Temario_new.pdf`, PDF pages 78–99, sha256 `96768192445fa7da87e09d265b0b578737d38ffca2559f22225ea49ac4cebe2a`.

No BOE, web, academies or external knowledge were used.

## Source ingest

- CanonicalPageText pages: 22
- Extracted text characters: 41,124
- Automatic SemanticSourceSpan records: 27
- Manual semantic provider: 0
- Manual map: 0
- Manual spans: 0

## V2 audit

- Initial active questions: 180
- Structurally complete V2 rows: 180/180
- Learning levels: 60 aprendizaje / 60 consolidacion / 60 tribunal
- Answer keys: A45 / B45 / C45 / D45
- Exact normalized duplicate groups: 0
- Near-duplicate pairs at Jaccard >= 0.82: 0
- Duplicate option sets: 0
- Undesired all/none shortcuts: 0
- Gross correct-option length clue candidates: 2 (`SMS-T21-0125`, `SMS-T21-0156`); QA warnings only, not material Governance exceptions.
- Canonical-range supported questions: 176
- Source-review-required input questions: 4

The four source-review rows cite PDF page 100, which is outside the supplied canonical range 78–99. They are quarantined before semantic mapping so the Factory does not fabricate evidence from an unavailable page.

## Semantic draft after canonical preflight

- Units: 3, all source-supported
- Concepts: 11 total = 0 high / 11 medium / 0 low
- Mappings: 176 total = 12 high / 164 medium / 0 low
- Unmapped source-supported questions: 0
- Manual semantic interventions: 0

MEDIUM confidence was not elevated merely because it was MEDIUM.

### Provisional automatic concept inventory

1. `SMS-T21-C01` · Portal de internet · 21 questions · pp. 79–81
2. `SMS-T21-C02` · Firma del personal público · 32 questions · pp. 81–83
3. `SMS-T21-C03` · Formato de conservación de actos · 10 questions · p. 83
4. `SMS-T21-C04` · Decisión de adecuación · 8 questions · p. 84
5. `SMS-T21-C05` · Informe preceptivo · 13 questions · pp. 86–87
6. `SMS-T21-C06` · Adhesión a la DEHú · 45 questions · pp. 87–93
7. `SMS-T21-C07` · Incidencia técnica en la DEHú · 7 questions · pp. 91–93
8. `SMS-T21-C08` · Entrega mediante datos de acceso · 10 questions · p. 94
9. `SMS-T21-C09` · Forma de expedir copias auténticas · 6 questions · p. 95
10. `SMS-T21-C10` · Firma o sello del índice · 10 questions · pp. 96–97
11. `SMS-T21-C11` · Conservación por procedimiento judicial · 14 questions · pp. 97–99

This inventory is recorded only as RUN 1 evidence. It is not an approved manual map.

## Coverage and generation

Coverage threshold: 4 primary questions per concept.

- Ready: 11/11 source-supported concepts
- Coverage gaps: 0
- Source-limited candidates: 0
- Actionable missing questions: 0
- Directed question generation slots: 0
- New questions generated: 0
- V2 25-field generated rows: not applicable because coverage required no new questions

## Materialization

Agent execution of the canonical work packets produced provisional study material only from the supplied canonical text:

- Study-content concept blocks: 11
- Flashcards: 22 (2 per source-supported concept)
- New questions: 0

Materialized content is provisional because Governance has blockers below. It must not be imported or promoted to production from RUN 1.

## Adversarial QA

Bank checks:

- 0 exact normalized stem duplicates
- 0 near-duplicate stem pairs at Jaccard >= 0.82
- 0 duplicate options
- 0 all/none shortcut options
- perfect 45/45/45/45 answer-key balance
- 2 non-blocking gross-length-clue candidates
- 4 hard source-range violations

Semantic QA additionally detects automatic over-merging. The 176 source-supported questions collapse to 11 medium-confidence concepts. The largest provisional concept (`SMS-T21-C06`) contains 45 questions and 45 distinct V2 concept labels, while other clusters also contain many materially different labels. This is not treated as a confidence-only issue: the resulting boundary is too broad for a reliable mastery concept.

## Governance Packet

### EXCEPTION QUEUE

1. `T21-SOURCE-0060` · `source_review_required` · BLOCKER
   - Subject: `SMS-T21-0060`
   - Evidence: V2 metadata cites PDF p. 100 / RD 203/2021 art. 54.3–54.4; canonical input ends at p. 99.
   - Proposal: keep quarantined. Resolve only if Governance supplies canonical p. 100 in a future authorized run.

2. `T21-SOURCE-0175` · `source_review_required` · BLOCKER
   - Subject: `SMS-T21-0175`
   - Evidence: V2 metadata cites PDF p. 100 / RD 203/2021 art. 54.3, third paragraph; canonical input ends at p. 99.
   - Proposal: keep quarantined. Resolve only if Governance supplies canonical p. 100 in a future authorized run.

3. `T21-SOURCE-0179` · `source_review_required` · BLOCKER
   - Subject: `SMS-T21-0179`
   - Evidence: V2 metadata cites PDF p. 100 / RD 203/2021 art. 54.3; canonical input ends at p. 99.
   - Proposal: keep quarantined. Resolve only if Governance supplies canonical p. 100 in a future authorized run.

4. `T21-SOURCE-0180` · `source_review_required` · BLOCKER
   - Subject: `SMS-T21-0180`
   - Evidence: V2 metadata cites PDF p. 100 / RD 203/2021 art. 54.4; canonical input ends at p. 99.
   - Proposal: keep quarantined. Resolve only if Governance supplies canonical p. 100 in a future authorized run.

5. `T21-SEMANTIC-OVERMERGE` · `concept_boundary` · BLOCKER
   - Subject: topic T21 automatic semantic draft.
   - Evidence: 176 supported questions become only 11 medium-confidence concepts; largest cluster has 45 questions / 45 distinct V2 labels and a single title that cannot faithfully delimit all of them.
   - Proposal: do not author a manual map. In a later authorized run, tighten the automatic clustering guard so broad `subapartado + shared span` transitivity cannot merge materially different labels. RUN 1 stops here; no RUN 2 is performed.

### Summary

- Source-review-required: 4
- Source-limited candidates: 0
- Total material exceptions: 5
- Blockers: 5
- Production allowed: no
- Import allowed: no
- Assessment: PARTIAL

## Efficiency vs T20

T20 benchmark: 226 questions, 7 units, 30 concepts, 60 flashcards, 0 exceptions.

T21 RUN 1: 180 questions (-20.4%), 3 units (-57.1%), 11 provisional supported concepts (-63.3%), 22 flashcards (-63.3%), 0 new questions. Provider/map/spans manual remain 0/0/0. The deterministic workload is materially lower than T20, but the source-range quarantine and semantic over-merge create Governance work that T20 did not require.

No RUN 2, import, production change or Tema 22 work is included.