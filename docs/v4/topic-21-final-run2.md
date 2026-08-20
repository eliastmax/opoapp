# T21 RUN2 · Editorial hardening, production import and smoke

Status: **IMPORT READY / IMPORTED**

Frozen input: T21 RUN1C STRONG PASS. Factory.7 and the approved mastery map were not rerun or modified.

Canonical source only: `Temario_new_T21_CANONICAL_PAGES_v2.json` / `Temario_new.pdf`, SHA256 `96768192445fa7da87e09d265b0b578737d38ffca2559f22225ea49ac4cebe2a`, PDF pp.78–99 plus p.100 only before `TEMA 22`.

## Editorial hardening

Exactly 15 questions were audited and hardened: existing `0125`, `0156`, `0165`, and RUN1C-generated `0181`–`0192`.

All 15 retain their canonical source and frozen mastery-family target. `0191` is the only item whose correct-answer position changed (C→D) in order to preserve the approved final bank balance; its tested rule and source remain unchanged.

| code | answer | option max/min length | nearest stem Jaccard | exact duplicate | result |
|---|---:|---:|---:|---:|---|
| SMS-T21-0125 | A | 1.19 | 0.091 | 0 | PASS |
| SMS-T21-0156 | D | 1.15 | 0.167 | 0 | PASS |
| SMS-T21-0165 | A | 1.06 | 0.000 | 0 | PASS |
| SMS-T21-0181 | A | 1.16 | 0.143 | 0 | PASS |
| SMS-T21-0182 | D | 1.20 | 0.143 | 0 | PASS |
| SMS-T21-0183 | C | 1.23 | 0.100 | 0 | PASS |
| SMS-T21-0184 | A | 1.38 | 0.111 | 0 | PASS |
| SMS-T21-0185 | D | 1.14 | 0.250 | 0 | PASS |
| SMS-T21-0186 | A | 1.27 | 0.222 | 0 | PASS |
| SMS-T21-0187 | C | 1.14 | 0.100 | 0 | PASS |
| SMS-T21-0188 | B | 1.18 | 0.000 | 0 | PASS |
| SMS-T21-0189 | C | 1.07 | 0.100 | 0 | PASS |
| SMS-T21-0190 | B | 1.11 | 0.000 | 0 | PASS |
| SMS-T21-0191 | D | 1.08 | 0.091 | 0 | PASS |
| SMS-T21-0192 | B | 1.24 | 0.111 | 0 | PASS |

Each item has four distinct alternatives. The distractors were rewritten as nearby confusions from the same canonical provisions rather than implausible or obviously false alternatives. Material editorial QA blockers: **0**.

## Frozen mastery import

- active questions: **192**
- answer balance: **A48 / B48 / C48 / D48**
- study units: **3**
- mastery concepts: **43** (`SMS-T21-C01`…`SMS-T21-C43`)
- primary mappings: **192**
- study blocks: **43**
- flashcards: **86**
- standard ready: **28**
- source_limited: **15**
- actionable gaps: **0**
- unmapped: **0**
- multiple-primary: **0**

Approved source ceilings persisted unchanged:
`C04=3, C07=3, C16=3, C21=3, C23=3, C26=2, C28=2, C31=3, C32=2, C35=3, C37=3, C38=3, C39=3, C41=3, C42=3`.

## Post-import smoke

- `prepare_my_v4_today_context()` consumes all **43** T21 concepts; minimum active primaries = 2 and active flashcards = 2.
- standard concept verify smoke: `C01`, requested 4 → selected 4 / active 4.
- source_limited ceiling-2 verify smoke: `C26`, requested 2 → selected 2 / active 2.
- source_limited ceiling-3 verify smoke: `C04`, requested 3 → selected 3 / active 3.
- mastery refresh smoke: a new T21 concept resolves cleanly to `unseen / no_evidence` before study evidence.
- V2 test creation smoke: Aprendizaje, Consolidación and Tribunal each select 5 T21 questions; the existing stage-lock contract is preserved and explicit free-mode override was used only inside a rolled-back smoke transaction.
- V3 recommendation context returns normally; weekly roadmap returns normally for the current user configuration.
- smoke-created tests/progress/mastery were executed inside rolled-back transactions: no smoke data persisted.

## Contamination

Non-T21 snapshot before and after import is identical:

`1a7ff7d053c82bad89a1a9b5e51ba5fc`

Counts both before and after: questions `4185`, units `56`, concepts `148`, primary mappings `856`, flashcards `301`.

**Contamination: 0.**

## Governance

RUN1 → RUN1B → RUN1C → RUN2:

- RUN1: 11 concepts; material overmerge; PARTIAL.
- RUN1B: 177 concepts / 174 singletons; material undermerge; PARTIAL.
- RUN1C: 43 approved mastery families; 180/180 mapped; 12 justified gap questions; STRONG PASS.
- RUN2: mastery map frozen; targeted editorial hardening; 192-question production import; smoke and contamination checks green.

Parser false headings `artículo 1.2` and `artículo 31` remain non-blocking tech debt. No Factory.8 and no Tema 22 work are included.
