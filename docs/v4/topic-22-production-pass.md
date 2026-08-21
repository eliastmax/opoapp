# T22 · Production Pass · source-corrected rerun

Base main: `780ddae053ca7efc90d061b574f6460cbc5a8588`.

## Source v2
- `Temario_new.pdf`; metadata SHA256 `96768192445fa7da87e09d265b0b578737d38ffca2559f22225ea49ac4cebe2a`; uploaded JSON SHA256 `295d4b1357831da0ddb561eea19a5b579130e92af4a9e7edd202b293ea666178`.
- Canonical logical order: p.100 from `TEMA 22` → pp.101–110 → pp.1–22 → p.23 only before `TEMA 23`.
- 34 page records; network=false; OCR=false.
- Factory parser: 31 automatic spans; manual provider/map/spans = 0/0/0.
- The previous 42-question / 16-family / 1-unit result remains historical only and was not reused.

## Corrected input audit
- Active input 180; V2 25-field valid 180/180; canonical support 180/180; source_review_required 0.
- Existing pedagogy: 60 aprendizaje / 60 consolidación / 60 tribunal.
- Existing answers A/B/C/D = 45/45/45/45.
- Exact duplicate stems 0; near-duplicates token-Jaccard ≥0.82 = 0; duplicate options 0.

## Factory.7
- Units/packets/semantic operations = 5/5/5:
- U01 Objeto y ámbito de aplicación: 69 questions → 27 families.
- U02 Tipos contractuales: 47 → 17.
- U03 Regulación armonizada: 32 → 12.
- U04 Régimen jurídico: 23 → 7.
- U05 Jurisdicción: 9 → 4.
- Mastery families = 67 = 61 HIGH / 6 MEDIUM / 0 LOW.
- Family-size distribution = 1q×19, 2q×14, 3q×19, 4q×5, 5q×6, 6q×2, 7q×2; singletons 19.
- Primary mappings = 180/180 = 154 HIGH / 26 MEDIUM / 0 LOW; lost 0; multiple-primary 0; source leakage 0; unit incoherence 0; anchor conflicts 0.
- Overmerge guards 0; undermerge guards 0; other material boundaries 0.

## Coverage / downstream
- Threshold unchanged at 4.
- Before generation: ready 15; real gaps 17 families / 23 questions.
- After generation: ready 20; source_limited 47; actionable gaps 0.
- Source-limited ceilings: SMS-T22-C02=2, SMS-T22-C03=3, SMS-T22-C04=1, SMS-T22-C05=2, SMS-T22-C06=2, SMS-T22-C07=1, SMS-T22-C12=3, SMS-T22-C14=1, SMS-T22-C15=3, SMS-T22-C16=3, SMS-T22-C17=2, SMS-T22-C20=3, SMS-T22-C21=3, SMS-T22-C22=3, SMS-T22-C23=2, SMS-T22-C24=3, SMS-T22-C25=1, SMS-T22-C26=1, SMS-T22-C27=1, SMS-T22-C28=2, SMS-T22-C30=3, SMS-T22-C31=3, SMS-T22-C33=3, SMS-T22-C34=2, SMS-T22-C35=2, SMS-T22-C36=3, SMS-T22-C37=2, SMS-T22-C38=3, SMS-T22-C39=2, SMS-T22-C42=3, SMS-T22-C43=3, SMS-T22-C44=2, SMS-T22-C45=3, SMS-T22-C46=1, SMS-T22-C47=3, SMS-T22-C52=3, SMS-T22-C53=2, SMS-T22-C55=2, SMS-T22-C56=2, SMS-T22-C57=1, SMS-T22-C59=3, SMS-T22-C61=2, SMS-T22-C62=3, SMS-T22-C63=2, SMS-T22-C64=3, SMS-T22-C66=2, SMS-T22-C67=2.
- Every source_limited family has concrete dimensions, covered question codes and a redundancy rationale in the provisional downstream package.
- Generated questions: SMS-T22-0181…SMS-T22-0203 (23), exact V2 25-field rows plus conceptCode sidecar from birth.
- Provisional final answers = 51/51/51/50; pedagogy = 68/68/67.
- Study blocks 67; flashcards 134.
- V2 rows are preserved in `docs/v4/topic-22-production-rerun-generated-v2-part1.csv`, `...-part2.csv`, and `...-part3.csv`.
- `docs/v4/topic-22-production-rerun-concept-map.json` is the generated-question → conceptCode sidecar.
- The full provisional downstream package (validated family resolution, source-capacity registry, 67 study blocks, 134 flashcards and generated rows) was materialized during the run; it was not imported to production.

## Editorial / adversarial QA
- Existing material warnings = 12:
- length clues: SMS-T22-0019 (1.73), 0036 (1.77), 0056 (1.70), 0059 (4.88), 0113 (1.71), 0118 (1.88), 0173 (1.73), 0177 (1.74).
- plausibility/absolutism: SMS-T22-0008, 0016, 0018, 0067.
- They are nonblocking and deliberately remain explicit follow-up before production import.
- Generated 23: gross-length clue 0; duplicate stems/options 0; internal or cross-bank near-duplicate Jaccard≥0.82 = 0; adversarial regeneration completed.

## Five representative families
### SMS-T22-C13 · Convenios públicos y vocación de mercado
- mastery: condiciones de exclusión de convenios públicos, cooperación/interés público, ausencia de vocación de mercado, 20 %, tres ejercicios y proyecciones.
- scope: art.6.1 pp.1–2; 6 questions; facets: convenio, 20 %, promedio, proyección; perspectives: regla/cálculo/requisitos/caso.
- one mastery: todo comprueba el mismo régimen de exclusión y cómo se acredita la ausencia de vocación de mercado.

### SMS-T22-C32 · Riesgo operacional en las concesiones
- mastery: riesgo de demanda/suministro, recuperación de inversiones/costes y exposición real a incertidumbre.
- scope: art.14.4 pp.7–8; 5 questions; facets: transferencia, modalidades, intensidad; perspectives: definición/contraste/caso.
- one mastery: son dimensiones inseparables del criterio de riesgo operacional que caracteriza la concesión.

### SMS-T22-C50 · Lotes y excepción a normas SARA
- mastery: acumulación de lotes, límites individuales y límite acumulado del 20 %.
- scope: arts.20.2, 21.2, 22.2 pp.15–16; 5 questions; facets: obra/suministro/servicio/20 %; perspectives: regla/comparación/cálculo/caso.
- one mastery: los tres artículos expresan una misma mecánica de lotes con importes individuales distintos.

### SMS-T22-C58 · Contratos típicos de Administraciones y excepciones privadas
- mastery: regla administrativa de contratos típicos y excepciones privadas financieras, artísticas/espectáculos y suscripciones.
- scope: art.25.1.a p.18; 7 questions; perspectives: clasificación/excepción/caso/contraste.
- one mastery: regla y excepciones forman una sola decisión de calificación.

### SMS-T22-C65 · Jurisdicción de contratos privados según fase
- mastery: contencioso en preparación/adjudicación y determinadas modificaciones frente a civil en efectos/extinción.
- scope: arts.27.1.b–c y 27.2.a pp.20–21; 3 existing + 1 generated; perspectives: fase/orden/caso/excepción.
- one mastery: todas exigen decidir el orden competente según fase y excepción de modificación.

## Comparison
- bad-source run → corrected rerun:
- supported 42→180; source_review_required 138→0; units 1→5; families 16→67; mappings 42→180.
- ready 3→20; source_limited 6→47 recalculated; gaps 7 families/10q not generated → 17 families/23q before generation → 0 after generation.
- study 0→67; flashcards 0→134; new questions 0→23.

## Governance
- No external source, no threshold tuning, no T22-specific Factory rule.
- Production import NO; merge #80 NO; T23 NO; Factory.8 NO.
- Parser tech debt is nonblocking: false internal headings `Artículo 34` and `Artículo 7`, plus physical-page sort causing the partial Article 29 span to extend through preamble before Article 1. No active T22 mapping is affected.
- Status before CI: PASSED structurally; 12 nonblocking editorial warnings remain.
