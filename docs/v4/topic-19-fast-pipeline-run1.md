# Tema 19 · FAST PIPELINE RUN 1 benchmark

Estado histórico: **RUN 1 aprobado por Gobernanza; continuado y cerrado en RUN 2**.

Cierre productivo y smokes: `docs/v4/topic-19-fast-pipeline-run2.md`.

## Input real

- Oposición: `auxiliar-administrativo-sms`.
- Tema: 19.
- Modo: `existing_bank`.
- Preguntas activas inspeccionadas en RUN 1: **240** (`SMS-T19-0001` … `SMS-T19-0240`).
- V4 productivo previo a RUN 1: **0 units / 0 concepts / 0 mappings / 0 cards**.
- Fuente sustantiva canónica única: **`Temario_new.pdf`**.
- Filas con soporte canónico utilizable por RUN 1: **221**.
- Filas entonces activas con `documento_referencia = temario_antiguo(1).pdf`: **19**; se conservaron en audit y quedaron en cuarentena, sin usarse para definir conceptos, mappings ni contenido V4.

Códigos en cuarentena:
`0041-0049`, `0097-0100`, `0115-0120` con prefijo `SMS-T19-`.

## RUN 1

`runContentFactoryTopic()` recibió el banco canónico elegible, un draft semántico derivado exclusivamente de `Temario_new.pdf` y los providers de generación/hardening del consumer T19.

Resultado provisional:

- 15 unidades.
- 40 conceptos high-confidence.
- 221 mappings existentes canónicos.
- Coverage inicial: 35 standard ready + 5 conceptos con un gap accionable cada uno.
- 5 preguntas nuevas (`0241-0245`) generadas concept-bound, con V2 completo y fuente `Temario_new.pdf`.
- Coverage final: 40 standard ready, 0 gaps accionables.
- 80 flashcards.
- 0 `source_limited_candidate`.
- 0 unmapped dentro del banco canónico elegible.
- 0 multiple-primary.

Gate 1 y Gate 2 estaban pendientes durante RUN 1; Gobernanza los aprobó posteriormente en una única revisión central.

## Exception-first

RUN 1 elevó una única causa raíz adicional a Gobernanza:

- `source_review_required`: las 19 preguntas heredadas sobre reglas de recursos posteriores al soporte sustantivo disponible en `Temario_new.pdf` no podían incorporarse ni reinterpretarse desde una fuente externa.

Se agruparon deliberadamente en una decisión central para evitar 19 microgates que representarían el mismo problema de fuente.

Gobernanza resolvió después esta excepción con `accept_recommendation`: las 19 preguntas conservan registros/historial, quedan inactivas y permanecen fuera de V4.

## factory_followup

**No bloqueante.** La Factory genérica todavía no tiene un contrato de primera clase para que la fase INGEST inyecte una excepción agrupada correspondiente a filas puestas en cuarentena antes de coverage. El consumer T19 construyó esa única excepción con los tipos/IDs/impact refs oficiales de Factory y la añadió al Governance Packet del benchmark.

No se abrió un sprint arquitectónico por ello.

## Intervención manual fuera de Factory

El worker tuvo que proporcionar el draft semántico canónico de T19 y agrupar la cuarentena de 19 filas legacy en una sola excepción de source review. El resto del flujo se ejecutó mediante Fast Pipeline y sus validadores.

## Límite productivo de RUN 1

Durante RUN 1 no se ejecutaron:

- `import_questions_batch`;
- `import_v4_study_content`;
- migraciones;
- cambios de mastery;
- cambios de UI;
- escrituras productivas de mappings/preguntas/V4.

Las escrituras autorizadas por Gobernanza se realizaron únicamente en RUN 2 y están documentadas en el cierre correspondiente.
