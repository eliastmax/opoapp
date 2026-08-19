# V4 — Mapa conceptual definitivo del Tema 13

Estado: candidato de contenido tras `T13-CONTENT.2`. **No importado y no fusionado**. Este documento sustituye editorialmente el mapa inicial de 29 conceptos del mismo PR.

Fecha de auditoría y gate: 2026-08-19.

## Fuentes de verdad

- Supabase producción `kimswvynzehmilqydcgz`: 99 preguntas activas reales del Tema 13, `SMS-T13-0001` a `SMS-T13-0099`.
- `Temario_new.pdf`, páginas 241-275 usadas por el banco.
- Ley 55/2003 consolidada, `BOE-A-2003-23101`.
- Contrato V4: un único `question_concepts.role = 'primary'` por pregunta; cobertura de consolidación a partir de 4 preguntas primarias activas distintas.

## Corrección C03

La descripción inicial decía erróneamente `no incorporarse justificadamente en plazo`. Se corrige en el paquete canónico: el decaimiento del artículo 20.3 exige que la falta de incorporación **sea imputable al interesado y no obedezca a causa justificada**. El resumen de unidad, flashcards y nueva pregunta de cobertura mantienen el mismo sentido.

## Gate final de granularidad

Pregunta editorial aplicada: **si el usuario falla solo una de las partes, ¿seguiría siendo suficientemente preciso diagnosticar el concepto completo?**

### C05 inicial — Nacionalidad, separación e inhabilitación

**Decisión: dividir.**

No sería preciso. Son tres causas de pérdida con presupuestos distintos: artículo 23 para nacionalidad, artículo 24 para separación disciplinaria firme y artículo 25 para penas de inhabilitación. Un usuario puede dominar la excepción de nacionalidad y fallar la firmeza o los tipos de inhabilitación sin que el diagnóstico conjunto indique qué conocimiento falla.

Resultado:

- `SMS-T13-C05` — Pérdida por nacionalidad — pregunta original 0018.
- `SMS-T13-C30` — Pérdida por separación del servicio — pregunta original 0019.
- `SMS-T13-C31` — Pérdida por inhabilitación — pregunta original 0020.

### C06 inicial — Jubilación e incapacidad permanente

**Decisión: dividir.**

No sería preciso. Jubilación contiene edad, prolongación, autorización y prórroga por cotización; incapacidad contiene grados extintivos. Comparten el efecto de pérdida, pero no el conocimiento jurídico que debe recuperarse.

Resultado:

- `SMS-T13-C06` — Jubilación — preguntas originales 0021-0022.
- `SMS-T13-C32` — Incapacidad permanente — pregunta original 0023.

### C17 inicial — Coordinación de convocatorias y comisiones de servicio

**Decisión: dividir.**

No sería preciso. El artículo 38 regula colaboración y coordinación cuando una convocatoria afecta a más de un servicio de salud; el artículo 39 regula comisiones de servicio, temporalidad, categoría/especialidad, retribución y reserva de origen. Son núcleos jurídicos independientes.

Resultado:

- `SMS-T13-C17` — Coordinación y colaboración en convocatorias — pregunta original 0059.
- `SMS-T13-C33` — Comisiones de servicio — preguntas originales 0060-0061.

### C27 inicial — Prescripción y cancelación de sanciones

**Decisión: dividir.**

No sería preciso. La prescripción del artículo 73.4 mide extinción temporal de la posibilidad de ejecutar la sanción y tiene dies a quo, interrupción y reinicio. La cancelación de los apartados 5-6 actúa después del cumplimiento sobre la anotación y la reincidencia. Un usuario puede conocer uno y confundir completamente el otro.

Resultado:

- `SMS-T13-C27` — Prescripción de sanciones — pregunta original 0094.
- `SMS-T13-C34` — Cancelación de anotaciones disciplinarias — pregunta original 0095.

## Mapa definitivo

```text
Tema 13 — Ley 55/2003. Estatuto Marco
├ U01 Derechos del personal
│  └ C01 Derechos individuales y colectivos
├ U02 Deberes del personal
│  └ C02 Deberes estatutarios
├ U03 Adquisición de la condición fija
│  └ C03 Requisitos sucesivos y efectos de falta de acreditación/incorporación
├ U04 Pérdida: renuncia, nacionalidad, separación e inhabilitación
│  ├ C04 Causas de pérdida y renuncia
│  ├ C05 Pérdida por nacionalidad
│  ├ C30 Pérdida por separación del servicio
│  └ C31 Pérdida por inhabilitación
├ U05 Jubilación, incapacidad y recuperación
│  ├ C06 Jubilación
│  ├ C32 Incapacidad permanente
│  └ C07 Recuperación de la condición fija
├ U06 Provisión y convocatorias
│  ├ C08 Principios y sistemas de provisión
│  └ C09 Convocatorias: periodicidad, bases y contenido
├ U07 Requisitos de participación y discapacidad
│  └ C10 Requisitos de participación y reserva por discapacidad
├ U08 Sistemas, órganos y nombramientos de personal fijo
│  ├ C11 Sistemas de selección y aspirantes en prácticas
│  └ C12 Órganos de selección y nombramientos
├ U09 Selección de personal temporal
│  └ C13 Selección, nombramiento y período de prueba temporal
├ U10 Promoción interna
│  ├ C14 Promoción interna: acceso, requisitos y preferencia
│  └ C15 Promoción interna temporal
├ U11 Movilidad, coordinación y comisiones de servicio
│  ├ C16 Movilidad por razón del servicio y movilidad voluntaria
│  ├ C17 Coordinación y colaboración en convocatorias
│  └ C33 Comisiones de servicio
├ U12 Carrera profesional
│  └ C18 Carrera profesional y homologación
├ U13 Régimen retributivo: estructura y básicas
│  ├ C19 Estructura, criterios y reglas generales de retribución
│  └ C20 Retribuciones básicas y pagas extraordinarias
├ U14 Retribuciones complementarias y situaciones especiales
│  ├ C21 Complementos retributivos
│  └ C22 Retribuciones de temporales y aspirantes en prácticas
├ U15 Responsabilidad y potestad disciplinaria
│  └ C23 Responsabilidad, competencia y principios disciplinarios
├ U16 Faltas y prescripción
│  ├ C24 Clases y fronteras entre faltas
│  └ C25 Prescripción de faltas
├ U17 Sanciones
│  ├ C26 Clases de sanciones y efectos
│  ├ C27 Prescripción de sanciones
│  └ C34 Cancelación de anotaciones disciplinarias
└ U18 Procedimiento y medidas provisionales
   ├ C28 Procedimiento y garantías
   └ C29 Suspensión provisional y efectos
```

Se conservan las 18 unidades. El gate modifica la granularidad conceptual, no requiere hacer unidades artificialmente pequeñas.

## Cobertura con las 99 preguntas originales

| Código | Preguntas originales | N | Estado antes de nuevas | Faltan |
|---|---|---:|---|---:|
| C01 | 0001-0004 | 4 | suficiente | 0 |
| C02 | 0005-0010 | 6 | suficiente | 0 |
| C03 | 0011-0013 | 3 | gap | 1 |
| C04 | 0014-0017 | 4 | suficiente | 0 |
| C05 | 0018 | 1 | gap | 3 |
| C30 | 0019 | 1 | gap | 3 |
| C31 | 0020 | 1 | gap | 3 |
| C06 | 0021-0022 | 2 | gap | 2 |
| C32 | 0023 | 1 | gap | 3 |
| C07 | 0024-0026 | 3 | gap | 1 |
| C08 | 0027-0028 | 2 | gap | 2 |
| C09 | 0029-0031 | 3 | gap | 1 |
| C10 | 0032-0035 | 4 | suficiente | 0 |
| C11 | 0036-0039 | 4 | suficiente | 0 |
| C12 | 0040-0041 | 2 | gap | 2 |
| C13 | 0042-0045 | 4 | suficiente | 0 |
| C14 | 0046-0049 | 4 | suficiente | 0 |
| C15 | 0050-0052 | 3 | gap | 1 |
| C16 | 0053-0058 | 6 | suficiente | 0 |
| C17 | 0059 | 1 | gap | 3 |
| C33 | 0060-0061 | 2 | gap | 2 |
| C18 | 0062-0063 | 2 | gap | 2 |
| C19 | 0064-0067 | 4 | suficiente | 0 |
| C20 | 0068-0070 | 3 | gap | 1 |
| C21 | 0071-0073 | 3 | gap | 1 |
| C22 | 0074-0075 | 2 | gap | 2 |
| C23 | 0076-0080 | 5 | suficiente | 0 |
| C24 | 0081-0086 | 6 | suficiente | 0 |
| C25 | 0087-0088 | 2 | gap | 2 |
| C26 | 0089-0093 | 5 | suficiente | 0 |
| C27 | 0094 | 1 | gap | 3 |
| C34 | 0095 | 1 | gap | 3 |
| C28 | 0096-0097 | 2 | gap | 2 |
| C29 | 0098-0099 | 2 | gap | 2 |

Resultado tras el gate, antes de añadir preguntas al banco:

- 18 unidades.
- **34 conceptos canónicos**.
- 99/99 preguntas originales con un único `primary`.
- media: **2,91 preguntas originales/concepto**.
- mediana: **3**.
- cobertura suficiente: **12/34 = 35,3 %**.
- `coverage_gap`: **22/34 = 64,7 %**.
- sin cobertura: **0**.
- preguntas adicionales exactas necesarias: **45**.

El aumento de 25 a 45 preguntas necesarias es intencional: deriva de priorizar precisión diagnóstica sobre una cobertura artificialmente favorable.

## Lote dirigido T13-CONTENT.2

Se preparan exactamente 45 candidatas, `SMS-T13-0100` a `SMS-T13-0144`.

- generación inicial trazable: `src/lib/v4-pilots/topic-13-coverage-gap-questions.ts`;
- lote final tras revisión editorial: `src/lib/v4-pilots/topic-13-coverage-gap-questions-reviewed.ts`;
- auditoría código → dimensión → fuente: `docs/v4/pilots/topic-13-gap-question-audit.md`.

Antes de reservar esos códigos se comprobó en Supabase que no existe ninguna pregunta del Tema 13 en ese rango.

Las candidatas no se añaden todavía a `questionMappings`: el importador V4 solo puede asociar preguntas activas reales del banco. Hasta que Gobernanza autorice la incorporación de estas preguntas al banco, el paquete canónico conserva de forma honesta los 22 `coverage_gap`; las pruebas calculan además que, si se validan e incorporan las 45 candidatas, **cada uno de esos 22 conceptos queda exactamente en 4 preguntas primarias**.

## Regla de generación aplicada

Cada candidata parte de las dimensiones ya comprobadas por las preguntas originales y busca otra dimensión cuando la norma lo permite: regla, excepción, sujeto, límite, dies a quo, interrupción, efecto, competencia, literalidad o mini caso. No se generan preguntas para conceptos que ya tienen cuatro o más primarias.

## Automatización y revisión humana

Automatizable:

- extracción de metadatos y fuentes;
- clustering sugerido;
- recuento de cobertura;
- detección de códigos libres;
- generación inicial de candidatos;
- validación estructural y cobertura prospectiva.

Revisión editorial obligatoria:

- decisión final de granularidad;
- fidelidad jurídica;
- distractores;
- ausencia de clones;
- pertinencia de cada nueva dimensión;
- aprobación antes de alta en banco/importación.

## Estado de producción

Tema 13 continúa sin contenido V4 importado en Supabase. Este sprint no realiza DDL, INSERT manual, importación V4 ni merge de PR.
