# Content Factory 4 — Semantic Accelerator

## Purpose

Semantic Accelerator removes the remaining manual provider-construction bottleneck before FAST PIPELINE. It does not introduce external legal knowledge and it does not turn Content Factory into an autonomous legal interpreter.

Target flow:

`canonical source representation + existing V2 bank -> buildSemanticTopicDraft() -> runContentFactoryTopicFromSemanticDraft() -> governance exceptions -> RUN 2`

The source of substantive truth remains the configured canonical source. For SMS this continues to be `Temario_new.pdf` exclusively.

## Canonical source representation

`SemanticSourceSpan` is an offline/versionable representation of source structure. A span may contain:

- stable span id;
- document name;
- source reference;
- heading and section path;
- article label as printed in the source;
- source text excerpt;
- page range.

The builder never fetches BOE, web pages, academies or other external material. Spans whose `document` differs from the canonical policy are excluded and raised as source-traceability blockers.

## Signals used

For existing-bank topics the builder combines only:

- canonical page overlap;
- article numbers already present in V2/source metadata;
- canonical section hierarchy;
- `apartado` / `subapartado`;
- V2 concept label;
- learning objective;
- perspective and trap metadata;
- question source/page metadata;
- optional approved V4 anchors.

No confidence percentage is produced. Confidence is qualitative (`high`, `medium`, `low`) and records its reason and evidence.

## Clustering

The builder first establishes unit candidates from source hierarchy plus V2 section signals. Concept clustering then uses multiple independent signals inside the same unit:

- exact concept/learning-objective agreement;
- same subpart plus common canonical source scope;
- strong label/objective token overlap plus common source evidence.

A shared article alone does not force a merge when the V2 signals distinguish different rules. Conversely, a single phrase does not automatically become its own concept merely because it occurs once.

Ambiguous boundaries remain provisional and are emitted as `concept_boundary` exceptions rather than hidden by arbitrary clustering.

## Mapping proposal

For every canonically eligible V2 question the builder scores candidate concepts only from its proposed unit. It prefers convergence of:

- V2 concept label;
- learning objective;
- canonical span;
- source scope;
- provisional cluster membership.

When one candidate dominates with source support the mapping is `high` confidence and requires no specific human approval. Credible competing primaries create `mapping_ambiguity`. Explicit non-canonical provenance creates `source_review_required` and the question is not mapped.

Coverage is never used to choose a prettier primary.

## Proposal metadata and exceptions

Every unit, concept and mapping has a parallel proposal record containing:

- `confidence`;
- reason;
- source span ids and source refs;
- semantic signals;
- affected question codes.

The main response is exception-first. `SemanticDraftMetrics` reports:

- high-confidence units;
- high-confidence concepts;
- automatic mappings;
- doubtful mappings;
- doubtful concept boundaries;
- source issues;
- blockers and total exceptions.

Full structures remain in the semantic draft/audit artifact.

## Study scaffold

The Accelerator does not fabricate final legal prose. For every proposed concept it prepares source-grounded inputs for the next Factory stages:

- source span ids;
- extractive summary inputs;
- essential source sentences;
- exam-key candidates;
- V2 trap signals;
- neighboring/confusable concept candidates;
- flashcard seeds tied to source evidence;
- generation dimensions derived from source/V2 wording.

This removes repetitive structuring while preserving the rule that final substantive study content must remain traceable to the canonical source.

## FAST PIPELINE integration

`SemanticTopicDraft.structuralDraft` is directly compatible with FAST PIPELINE. `runContentFactoryTopicFromSemanticDraft()` passes the proposed units, concepts and mappings as the provisional provider. The caller no longer writes the provider arrays manually.

Downstream high-quality study-content/question generation remains an operation of FAST PIPELINE; the Semantic Accelerator provides its structured evidence inputs rather than pretending deterministic clustering can replace editorial generation.

## Existing-bank behavior

Existing V2 metadata is the strongest source of semantic discrimination. High confidence requires convergence with canonical source evidence. Non-canonical rows are quarantined. Optional V4/approved anchors stabilize known codes and surface conflicts rather than silently rewriting approved material.

## Greenfield behavior

Without a bank, the builder derives units from canonical section hierarchy and concept seeds from canonical headings/articles. Unit confidence can be high when source structure is explicit, but concept confidence defaults lower because no question evidence exists. This is intentional.

## Retrospective goldens

T13, T18 and T19 are used only as immutable references. Tests project their approved structure into the same kinds of signals the builder consumes and measure unit-title recovery, concept-title recovery and semantic mapping recovery. They do not rewrite golden packages.

The replay is a regression for deterministic reconstructability, not a claim that historical raw V2 metadata was identical to the projection. In particular, the repository snapshot for T19 does not retain all 25 historical V2 semantic fields for the 221 canonical rows; a future real topic remains the decisive live benchmark.

## Human review policy

Human review remains necessary for:

- low confidence;
- material medium-confidence boundaries/mappings;
- source-review issues;
- anchor conflicts;
- adversarial question QA;
- source-limited decisions;
- substantive source interpretation that deterministic signals cannot resolve.

High-confidence artifacts with clean QA remain audit-visible but do not require element-by-element approval.

## Production safety

Semantic Accelerator is offline/library-only. It performs no Supabase writes, migrations or imports. Production safety remains owned by FAST PIPELINE gates and the normal import boundary.
