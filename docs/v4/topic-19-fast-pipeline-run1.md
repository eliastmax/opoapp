# Tema 19 · FAST PIPELINE RUN 1 benchmark

Estado: **draft / no producción / pendiente de una revisión central de Gobernanza**.

## Input real

- Oposición: `auxiliar-administrativo-sms`.
- Tema: 19.
- Modo: `existing_bank`.
- Preguntas activas inspeccionadas: **240** (`SMS-T19-0001` … `SMS-T19-0240`).
- V4 productivo previo: **0 units / 0 concepts / 0 mappings / 0 cards**.
- Fuente sustantiva canónica única: **`Temario_new.pdf`**.
- Filas con soporte canónico utilizable por RUN 1: **221**.
- Filas activas con `documento_referencia = temario_antiguo(1).pdf`: **19**; se conservan en audit pero quedan en cuarentena y no se usan para definir conceptos, mappings ni contenido V4.

Códigos en cuarentena:
`0041-0049`, `0097-0100`, `0115-0120` con prefijo `SMS-T19-`.

## RUN 1

`runContentFactoryTopic()` recibe el banco canónico elegible, un draft semántico derivado exclusivamente de `Temario_new.pdf` y los providers de generación/hardening del consumer T19.

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

Gate 1 y Gate 2 siguen pendientes: el draft puede existir y pasar QA, pero no puede ser import-ready.

## Exception-first

RUN 1 eleva una única causa raíz adicional a Gobernanza:

- `source_review_required`: las 19 preguntas heredadas sobre reglas de recursos posteriores al soporte sustantivo disponible en `Temario_new.pdf` no pueden incorporarse ni reinterpretarse desde una fuente externa.

Se agrupan deliberadamente en una decisión central para evitar 19 microgates que representarían el mismo problema de fuente.

## factory_followup

**No bloqueante.** La Factory genérica todavía no tiene un contrato de primera clase para que la fase INGEST inyecte una excepción agrupada correspondiente a filas puestas en cuarentena antes de coverage. El consumer T19 construye esa única excepción con los tipos/IDs/impact refs oficiales de Factory y la añade al Governance Packet del benchmark.

**No bloqueante.** `runContentFactoryTopic()` es un orquestador y no incorpora todavía un motor que interprete por sí solo el PDF y el banco para producir el provider semántico. En este benchmark el worker tuvo que construir el mapa/mappings/contenido y los specs canónicos de las cinco preguntas antes de entregarlos al runner. Esto es compatible con la API actual, pero significa que el benchmark no demuestra automatización semántica end-to-end del ingest documental.

No se abre un sprint arquitectónico por ninguno de estos puntos. Son mejoras futuras si Gobernanza considera que el benchmark exige automatización semántica más profunda.

## Intervenciones manuales fuera de Factory

Se contabilizan **2 clases de intervención manual del worker fuera del orquestador**:

1. construir el provider semántico canónico de T19 (15 unidades, 40 conceptos, 221 mappings, study content y specs de las cinco preguntas) a partir de `Temario_new.pdf` y del banco inspeccionado;
2. agrupar la cuarentena de 19 filas legacy en una sola excepción `source_review_required` después del filtrado canonical-only de ingestión.

Una vez entregados esos inputs, Fast Pipeline sí ejecuta automáticamente coverage, planificación de gaps, generación concept-bound, hardening/QA, V2/V4, exception/readiness y conserva el límite productivo. No hubo Gate 1/Gate 2/microgate humanos separados durante RUN 1.

## Valoración del benchmark

El ahorro operativo frente al flujo de Tema 18 es **alto**, porque desaparecen las interrupciones humanas intermedias y RUN 1 deja un paquete prácticamente completo con una sola excepción de Gobernanza. No se clasifica como `muy alto` porque la construcción semántica del provider todavía requiere intervención del worker fuera del runner.

## Límite productivo

En RUN 1 no se ha ejecutado ni preparado para ejecución automática:

- `import_questions_batch`;
- `import_v4_study_content`;
- migraciones;
- cambios de mastery;
- cambios de UI;
- escrituras productivas de mappings/preguntas/V4.

RUN 2 queda expresamente fuera de este PR hasta que Gobernanza resuelva la exception queue en una sola revisión central.
