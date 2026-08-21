# T24 Fast Production — final production candidate

## Source contract

- Base main: `ef94af27b417c17266b7e00817b9abeb777d4969`
- Branch: `agent/v4-t24-fast-production`
- Factory: 8, unchanged
- Primary source: `Temario_new.pdf`, p.33 from `TEMA 24` + pp.34–40.
- Authorized supplementary source: `temario_antiguo.pdf`, pp.697–781, only for Word, Excel and e-mail content not developed in `Temario_new.pdf`.
- No web/BOE/academies/external substantive sources.

The initial sole-source STOP was resolved by the T24 governance source manifest. `Temario_new.pdf` keeps precedence wherever it contains substantive material; the older temario is supplementary only for the missing Word/Excel/e-mail blocks.

## Final production state

- Questions: 122 → 156 active (`SMS-T24-0205`…`SMS-T24-0238` added).
- Source support: 63 `Temario_new.pdf` / 93 `temario_antiguo.pdf` / 0 unsupported.
- Uncovered material: 0.
- Units: 5.
- Mastery concepts: 37.
- Primary mappings: 156.
- Study blocks: 37.
- Flashcards: 74.
- Standard-ready / source-limited: 26 / 11.
- Actionable gaps / unmapped / multiple-primary / source_review_required: 0 / 0 / 0 / 0.
- Final answer balance: A/B/C/D = 39/39/39/39.
- Editorial QA: GREEN; 9 existing questions hardened; 0 length clues, duplicate stems/options or near-duplicates >=0.82.

## Functional validation

- V4 smoke: GREEN.
- Source-limited ceiling 2 and 3: GREEN; ceiling 1 N/A.
- V2 Aprendizaje / Consolidación / Tribunal: 5/5 each.
- V3 recommendation / weekly roadmap: GREEN.
- Cross-topic contamination: 0. Outside T24 PRE=POST: 4326 total questions / 4307 active / 19 inactive; 67 units; 276 concepts; 1400 primary mappings; 557 flashcards.
- T13–T23 production integrity: GREEN.
- Factory.8 and accordion remain covered by the final repository Quality gate.

## Merge gate

Production import is complete. This branch may be merged only after final tests, `tsc --noEmit`, build and GitHub Quality succeed on the final documentation HEAD. No Factory.9 was opened.
