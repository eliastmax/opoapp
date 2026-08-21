# T24 Fast Production — STOP at canonical source audit

## Scope

- Base main: `ef94af27b417c17266b7e00817b9abeb777d4969`
- Branch: `agent/v4-t24-fast-production`
- PR: #84 (draft)
- Factory: 8, unchanged
- Canonical input: `Temario_new_T24_CANONICAL_PAGES.json`
- Sole source: `Temario_new.pdf`
- Canonical scope: p.33 from `TEMA 24`, pp.34–40 full, p.41 excluded
- External sources: 0
- Manual provider/map/spans: 0/0/0

## Preflight result

Production contains 122 active T24 questions. All 122 have the V2 metadata fields populated.

Only 38 questions currently identify `Temario_new.pdf` pages 33–40. The remaining 84 identify `temario_antiguo.pdf` pages 697–781, outside the sole-source contract.

This is substantive rather than a stale-reference-only issue. Those 84 questions ask detailed knowledge about Word, Excel, and e-mail, including Word document/templates/styles/tables/page configuration/mail merge; Excel workbook/worksheet/formulas/references/tables/data validation/sorting; and e-mail addresses/POP/IMAP/SMTP/webmail.

The supplied canonical T24 corpus mentions Word, Excel and e-mail only in the topic heading on p.33. Pages 33–40 otherwise develop binary/storage units, hardware/software, memory/peripherals, storage systems, file servers and operating systems. The detailed propositions needed to determine the 84 answers do not occur in the canonical corpus.

Therefore the 84 rows are `source_review_required` and cannot be resolved from the declared source. This meets the governance STOP condition `source_review no resoluble` / `respuesta correcta indeterminable` under the sole-source contract.

## Execution state

- Active questions at STOP: 122
- V2 complete: 122/122
- Canonical-metadata-supported: 38
- Source review required: 84
- Source review resolvable from canonical corpus: 0
- Production writes: 0
- Mastery resolution: not executed after blocker
- Source Coverage Closure final: not executed after blocker
- Generation/import/smokes/Quality: not executed
- PR merged: no
- T24 production changed: no

No Factory.9/tuning was opened and no work outside T24 was performed.
