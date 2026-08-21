# T22 · Production Pass

Base: `780ddae053ca7efc90d061b574f6460cbc5a8588`

## Canonical source
- Contract: `CanonicalPageText[]`.
- Document: `Temario_new.pdf`.
- Metadata SHA256: `96768192445fa7da87e09d265b0b578737d38ffca2559f22225ea49ac4cebe2a`.
- Uploaded JSON byte SHA256: `c1a6ac9a277a442939546f624c33b56f9dacf23881f9fe0a6ce2e166a2ae445a`.
- Pages: 100–150, 51 page records.
- Automatic semantic spans using `canonicalPageTextToSemanticSourceSpans`: **65**.
- Manual provider/map/spans: **0 / 0 / 0**.

## Material canonical-source exception
The attached canonical packet is internally inconsistent with the declared T22 scope:
- pp.100–110 contain the T22 heading and LCSP material through article 5;
- p.111 begins `Ley 39/2015` and the remainder through p.150 is Procedure Administrative Common Act material;
- 138/180 active T22 questions reference source pages outside the supplied LCSP segment and cannot be canonically supported from this packet.

Per governance, no BOE/web/academy/external legal knowledge was used to repair this. Those 138 rows are `source_review_required`.

Breakdown:
- Objeto y ámbito de aplicación: 42 supported / 27 source_review_required.
- Tipos contractuales: 0 / 47.
- Regulación armonizada: 0 / 32.
- Régimen jurídico: 0 / 23.
- Jurisdicción: 0 / 9.

This is a **source-input blocker**, not a generic Factory.7 architecture defect. Factory.8 is not opened.

## V2 audit
- Active input: **180**.
- Exact 25-field completeness: **180/180 valid**.
- Pedagogical distribution: aprendizaje 60 / consolidación 60 / tribunal 60.
- Answer balance: A/B/C/D = 45/45/45/45.
- Exact duplicate stems: 0 groups.
- Near-duplicate stems (token Jaccard >= 0.82): 0 pairs.
- Duplicate options within a row: 0.
- Material correct-answer length-clue warnings (correct length >= 1.70× distractor average): 8 rows: `SMS-T22-0019`, `0036`, `0056`, `0059`, `0113`, `0118`, `0173`, `0177`.
- Additional supported-bank plausibility warnings: `SMS-T22-0008`, `0016`, `0018`, `0067` use broad/absolute distractors that make the correct category easier to infer than desired.
- Total editorial QA warnings: **12**. These are nonblocking relative to the stronger canonical-source blocker and were not rewritten because production import is forbidden and most unsupported rows lack canonical proof.

## Supported-subset pipeline
Only the 42 canonically supportable input questions were admitted to family resolution.

- Units: **1** (`Objeto y ámbito de aplicación`).
- Family packets: **1**.
- Semantic `resolvePacket(...)` operations: **1**.
- Validator rejected operations: **0**.
- Mastery families: **16** = 13 HIGH / 3 MEDIUM / 0 LOW.
- Mappings: **42/42 primary** = 28 HIGH / 14 MEDIUM / 0 LOW.
- Unmapped: 0.
- Multiple-primary: 0.
- Source leakage inside supported subset: 0.
- Overmerge exceptions: 0.
- Undermerge exceptions: 0.

### Family map
| Code | Title | Q | Confidence | Canonical scope | Existing questions |
|---|---|---:|---|---|---|
| SMS-T22-C01 | Principios y eficiencia de la contratación pública | 2 | HIGH | LCSP art. 1.1 · p.104 | SMS-T22-0001, SMS-T22-0061 |
| SMS-T22-C02 | Régimen jurídico de los contratos administrativos como objeto legal | 1 | HIGH | LCSP art. 1.2 · p.104 | SMS-T22-0002 |
| SMS-T22-C03 | Criterios sociales y medioambientales transversales | 3 | HIGH | LCSP art. 1.3 · p.104 | SMS-T22-0003, SMS-T22-0062, SMS-T22-0122 |
| SMS-T22-C04 | Acceso de pymes y economía social | 1 | HIGH | LCSP art. 1.3 · p.104 | SMS-T22-0004 |
| SMS-T22-C05 | Onerosidad y beneficio económico | 2 | HIGH | LCSP art. 2.1 · pp.104-105 | SMS-T22-0005, SMS-T22-0121 |
| SMS-T22-C06 | Contratos subvencionados remitidos al artículo 23 | 2 | HIGH | LCSP art. 2.2 · p.105 | SMS-T22-0006, SMS-T22-0063 |
| SMS-T22-C07 | Identificación de prestaciones mediante CPV | 1 | HIGH | LCSP art. 2.4 · p.105 | SMS-T22-0007 |
| SMS-T22-C08 | Entidades integrantes del sector público | 7 | MEDIUM | LCSP art. 3.1 · pp.105-107 | SMS-T22-0008, SMS-T22-0009, SMS-T22-0013, SMS-T22-0014, SMS-T22-0015, SMS-T22-0065, SMS-T22-0125 |
| SMS-T22-C09 | Criterios de fundación pública | 6 | HIGH | LCSP art. 3.1.e · p.106 | SMS-T22-0010, SMS-T22-0011, SMS-T22-0012, SMS-T22-0064, SMS-T22-0123, SMS-T22-0124 |
| SMS-T22-C10 | Administraciones Públicas y consorcios con ingresos de mercado | 4 | MEDIUM | LCSP art. 3.2 · p.107 | SMS-T22-0016, SMS-T22-0017, SMS-T22-0066, SMS-T22-0126 |
| SMS-T22-C11 | Poder adjudicador y relaciones entre categorías subjetivas | 3 | MEDIUM | LCSP art. 3.3 · p.107 | SMS-T22-0018, SMS-T22-0067, SMS-T22-0068 |
| SMS-T22-C12 | Partidos y organizaciones: contratación SARA e instrucciones internas | 2 | HIGH | LCSP art. 3.4 · p.108 | SMS-T22-0069, SMS-T22-0127 |
| SMS-T22-C13 | Régimen de negocios jurídicos excluidos | 3 | HIGH | LCSP art. 4 · p.108 | SMS-T22-0019, SMS-T22-0070, SMS-T22-0128 |
| SMS-T22-C14 | Exclusiones de concesiones en defensa y seguridad | 3 | HIGH | LCSP art. 5.2 · p.109 | SMS-T22-0071, SMS-T22-0072, SMS-T22-0073 |
| SMS-T22-C15 | Prestaciones mixtas de defensa y prohibición de elusión | 1 | HIGH | LCSP art. 5.3 · pp.109-110 | SMS-T22-0074 |
| SMS-T22-C16 | Procedimientos específicos internacionales en defensa y seguridad | 1 | HIGH | LCSP art. 5.4 · p.110 | SMS-T22-0075 |

## Coverage on supported subset
Coverage threshold remains 4; no threshold changes were made for T22.

- Ready: **3** families.
- Source-limited already at ceiling: **6** families.
- Real actionable gaps: **7** families / **10** missing questions.
- No generation was executed because the canonical-source blocker prevents a safe topic-level production package.
- Study blocks materialized: **0**.
- Flashcards materialized: **0**.
- New questions materialized: **0**.

Source-limited examples:
- C03 ceiling 3: transversal/preceptive condition, relation to object, application to a contrary case; further items would paraphrase the same rule.
- C04 ceiling 1: one independent canonical fact: facilitate access of SMEs and social-economy companies.
- C05 ceiling 2: definition of onerous contract + application to indirect benefit.
- C06 ceiling 2: rule of inclusion + referral relationship to article 23; article 23 itself is absent from the usable canonical LCSP segment.
- C13 ceiling 3: special regime, principles for doubts/gaps, case application without converting the excluded business.
- C14 ceiling 3: the three distinct art. 5.2 exclusion circumstances supplied in the canonical segment.

## Five-family audit sample

### SMS-T22-C01 · Principios y eficiencia de la contratación pública
- masteryStatement: Estudiar y retener los principios que debe garantizar la contratación y los elementos que conectan la eficiencia del gasto con necesidades, competencia y oferta económicamente más ventajosa.
- canonical scope: LCSP art. 1.1 · p.104
- questions: 2.
- facets grouped: principios de contratación; principios y eficiencia del gasto.
- perspectives: reconocimiento_directo; afirmacion_correcta.
- one concept because both questions test the same article 1.1 mastery: what procurement must guarantee and how efficient fund use is operationalized.

### SMS-T22-C05 · Onerosidad y beneficio económico
- masteryStatement: Determinar cuándo un contrato es oneroso atendiendo a la existencia de beneficio económico directo o indirecto.
- canonical scope: LCSP art. 2.1 · pp.104-105
- questions: 2.
- facets grouped: contrato oneroso; beneficio económico indirecto.
- perspectives: definicion; caso_practico.
- one concept because the case is simply application of the same direct-or-indirect economic-benefit rule.

### SMS-T22-C08 · Entidades integrantes del sector público
- masteryStatement: Clasificar las principales entidades y criterios de integración en el sector público del artículo 3.1, incluidos supuestos societarios y funcionales.
- canonical scope: LCSP art. 3.1 · pp.105-107
- questions: 7.
- facets grouped: administraciones territoriales, Seguridad Social, Mutuas, sociedades mercantiles públicas, entidades de interés general.
- perspectives: clasificacion; requisitos; combinacion_requisitos; caso_practico.
- one concept because the learning task is the article 3.1 inclusion taxonomy and its criteria, not the individual question labels.

### SMS-T22-C09 · Criterios de fundación pública
- masteryStatement: Aplicar los criterios alternativos de aportación, patrimonio permanente y mayoría de votos del patronato para identificar una fundación pública.
- canonical scope: LCSP art. 3.1.e · p.106
- questions: 6.
- facets grouped: aportación inicial/posterior, patrimonio >50% permanente, mayoría de votos en patronato.
- perspectives: requisitos; combinacion_requisitos; caso_practico.
- one concept because the three alternatives are mutually comparable criteria inside one legal classification rule.

### SMS-T22-C14 · Exclusiones de concesiones en defensa y seguridad
- masteryStatement: Distinguir las circunstancias de exclusión vinculadas a programas de cooperación, despliegues en terceros Estados y concesiones adjudicadas a otro Estado.
- canonical scope: LCSP art. 5.2 · p.109
- questions: 3.
- facets grouped: programa de cooperación, tercer Estado/zona de operaciones, concesión a otro Estado.
- perspectives: requisitos; caso_practico; clasificacion.
- one concept because all three are the enumerated alternative circumstances of the same art. 5.2 exclusion regime.

## Governance
- Provider manual: 0.
- Manual family map: 0; the map above is the output of the single semantic packet resolution.
- Manual source spans: 0.
- External source use: 0.
- Production import: NO.
- Merge: NO.
- T23: NO.
- Factory.8: NO.
- Status: **PARTIAL** because the supplied canonical packet cannot support 138/180 active T22 questions and is internally contaminated from p.111 onward.
