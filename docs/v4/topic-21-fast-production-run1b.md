# T21 · FAST PRODUCTION PASS · RUN 1B

Factory base: `5a8f10d1ffce1fe35ba5a52c842394422cce271b` (`CONTENT-FACTORY.6`, merged by normal merge).

T21 branch received that main by a two-parent normal merge commit before this rerun. No rebase, squash, force push, production write or import was used.

Canonical source only: `Temario_new_T21_CANONICAL_PAGES_v2.json` → `Temario_new.pdf`, PDF pages 78–100, with page 100 truncated immediately before the explicit `TEMA 22` heading. Source PDF sha256: `96768192445fa7da87e09d265b0b578737d38ffca2559f22225ea49ac4cebe2a`.

No BOE, web, academies or external substantive knowledge were used.

## Canonical ingest

- CanonicalPageText pages: 23
- Canonical text characters: 42,440
- Automatic SemanticSourceSpan records: 27
- Questions with usable canonical span evidence: 180/180
- Manual semantic provider: 0
- Manual map: 0
- Manual spans: 0

Page 100 extends the existing automatic Article 54 span to pp. 99–100; it does not create a manually authored span.

The known parser follow-ups remain non-blocking: internal references beginning with `Artículo 1.2` and `Artículo 31` can still be split as article headings. They do not prevent T21 RUN 1B and are not repaired in this sprint.

## V2 bank audit

- Active questions: 180
- Required editorial/source fields missing: 0
- Learning levels: 60 aprendizaje / 60 consolidación / 60 tribunal
- Answer keys: A45 / B45 / C45 / D45
- Wrong canonical document: 0
- Invalid canonical page ranges: 0
- Exact normalized duplicate stem groups: 0
- Near-duplicate stem pairs at Jaccard >= 0.82: 0
- Duplicate options: 0
- Undesired todas/ninguna shortcut options: 0
- Gross correct-option length warnings: 3 (`SMS-T21-0125`, `SMS-T21-0156`, `SMS-T21-0165`)

The three gross-length findings remain review warnings, not blockers. No question is rewritten merely to force zero warnings.

## Page 100 retry

All four formerly quarantined rows are now directly supported by the supplied canonical page 100 and re-enter the normal semantic pass:

- `SMS-T21-0060` — art. 54.3–54.4: minimum preserved elements, database reconstruction/verification requirements and long-term preservation.
- `SMS-T21-0175` — art. 54.3: information retained in databases follows the same retention periods as the corresponding electronic documents.
- `SMS-T21-0179` — art. 54.3: minimum preserved elements plus reconstruction and identification/signature verification criteria.
- `SMS-T21-0180` — art. 54.4: migration to formats/supports that preserve access and planning of long-term digital preservation.

Result: 4/4 automatically reincorporated; `source_review_required = 0`.

## Semantic Draft · Factory.6 raw pass

The rerun starts from the full 180-question bank and the v2 canonical source. It does not reuse the 11 RUN 1 concepts and supplies no approved T21 anchors.

- Units: 3
- Concepts: 177 = 3 HIGH / 174 MEDIUM / 0 LOW
- Cluster-size distribution: 174 singletons + 3 two-question clusters
- Largest cluster size: 2 (three-way tie; deterministic first is `SMS-T21-C116`)
- Largest deterministic cluster questions: `SMS-T21-0036`, `SMS-T21-0124`
- Largest cluster distinct conceptLabels: 2
- Largest cluster source: Real Decreto 203/2021, art. 43.2, p. 91
- Largest cluster subparts: `Práctica de notificaciones electrónicas` + `Aviso y Dirección Electrónica Habilitada única`
- Largest cluster title: `Primera notificación en papel a obligado`

That largest cluster is coherent: both questions test the same art. 43.2 exception in an ex-officio procedure — first notification on paper to a person obliged to interact electronically when the Administration lacks electronic contact data for the availability notice — with near-equivalent concept labels.

Mappings:

- 180 total
- 180 HIGH / 0 MEDIUM / 0 LOW
- 0 hybrids
- 0 questions lost
- 0 mappings moved away from their recommended raw cluster

HIGH mapping confidence is the unchanged scoring outcome (the question's own concept title/source evidence plus the recommended-cluster signal). No confidence rule was raised for T21.

## Material semantic boundary finding

Factory.6 successfully eliminates the RUN 1 single-link overmerge: the former 45-question / 45-label giant cluster no longer exists.

However the raw result now exposes the opposite material problem: **catastrophic undermerge / fragmentation**.

Evidence:

- 177 concepts for 180 questions (98.3% concepts/questions)
- 174/177 concepts are single-question concepts
- maximum cluster size is 2
- the bank already contains many concept labels that are close but not lexically close enough for the current raw compatibility rule to join safely
- a four-primary-question mastery threshold therefore yields 177 coverage gaps and 528 nominal missing questions

This is not treated as a confidence-only issue. A mastery concept map in which almost every existing question becomes its own concept is not semantically defensible, and generating 528 questions against those provisional one-question boundaries would amplify a structural error.

### Governance exception

`T21-SEMANTIC-UNDERMERGE` · `concept_boundary` · **BLOCKER**

- Subject: T21 automatic semantic draft.
- Evidence: 177 concepts / 180 questions; 174 singleton concepts; largest cluster 2; 528 nominal missing questions.
- Decision required later: improve the generic semantic compatibility/cluster representation so genuinely equivalent or same-mastery concepts can join without restoring structural-only identity or single-link transitiveness.
- Explicitly prohibited resolution in this run: manual T21 concept map, manual provider, manual spans or weakening the Factory.6 anti-overmerge rules.

No pairwise material boundary alternative emitted by the current title-overlap heuristic survives separately; the Governance blocker is the topic-level fragmentation pattern above.

## Coverage and work packets

Coverage threshold: 4 primary questions per concept.

- Ready: 0/177
- Coverage gaps: 177
- Actionable nominal missing questions: 528
- Source-review-required concepts/questions: 0
- Source-limited candidates: 0
- Unmapped questions: 0
- Duplicate primary mappings: 0

Canonical work packets remain technically executable:

- Study-content work packets: 177
- Flashcard work packets: 177 (minimum output contract: 2 cards/concept = 354 cards if executed)
- Question-gap work packets: 528
- Missing canonical-text concepts: 0

Because `T21-SEMANTIC-UNDERMERGE` is a material structural blocker, RUN 1B does **not** materialize 177 study blocks, 354 flashcards or 528 new questions on top of the invalid provisional boundaries.

Materialized in RUN 1B:

- Study content: 0 accepted/materialized
- Flashcards: 0 accepted/materialized
- New questions: 0

The prepared packets/slots are recorded only as evidence of downstream impact. They are not production-ready artifacts.

## Governance Packet

- `source_review_required`: 0
- Material concept boundaries: 1 (`T21-SEMANTIC-UNDERMERGE`)
- QA review warnings: 3 (`0125`, `0156`, `0165`), non-blocking
- Material exceptions: 1
- Blockers: 1
- Manual semantic provider/map/spans: 0 / 0 / 0
- Other manual semantic interventions: 0
- Production allowed: no
- Import allowed: no
- Assessment: **PARTIAL**

## RUN 1 → RUN 1B

| Metric | RUN 1 | RUN 1B |
| --- | ---: | ---: |
| Supported questions | 176 | 180 |
| Automatic spans | 27 | 27 |
| Units | 3 | 3 |
| Concepts | 11 | 177 |
| Concept confidence | 0H / 11M / 0L | 3H / 174M / 0L |
| Largest cluster | 45 q / 45 labels | 2 q / 2 labels |
| Mappings | 176 (12H / 164M / 0L) | 180 (180H / 0M / 0L) |
| source_review_required | 4 | 0 |
| Coverage ready | 11 | 0 |
| Coverage gaps | 0 | 177 |
| Nominal missing questions | 0 | 528 |
| QA length warnings | 2 | 3 |
| Material exceptions | 5 | 1 |
| Blockers | 5 | 1 |
| Manual provider/map/spans | 0 / 0 / 0 | 0 / 0 / 0 |

RUN 1B therefore fixes both confirmed RUN 1 causes mechanically — canonical p.100 support and single-link overmerge — but does not pass Governance because the stricter raw semantic rule now fragments the topic into question-sized concepts.

No RUN 2, T21 import, T21 production write, PR #77 merge or Tema 22 work is included.