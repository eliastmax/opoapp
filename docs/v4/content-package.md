# V4 — Paquete portátil de contenido por tema

## Objetivo

El Generador V4 no escribirá directamente en Supabase. Producirá primero un paquete portable, versionado y validable para un único tema.

La unidad de intercambio es `V4StudyContentPackage`.

El paquete usa códigos estables y nunca UUID generados por una base de datos. Así puede revisarse, versionarse, probarse e importarse en distintos entornos sin romper relaciones.

## Identificadores estables

Convención recomendada:

- unidad: `SMS-T18-U01`;
- concepto: `SMS-T18-C01`;
- flashcard: `SMS-T18-F01`;
- pregunta existente: su `questions.codigo`, por ejemplo `SMS-T18-0001`.

Los códigos no deben reutilizarse para otro contenido aunque cambie el título visible.

`study_units.code`, `concepts.code` y `flashcards.code` son únicos dentro de una oposición.

## Forma del paquete

```ts
{
  version: "4.0",
  oppositionCode: "sms_aux_admin",
  topicNumber: 18,
  sourceRevision: "2026-08-19",
  units: [...],
  concepts: [...],
  questionMappings: [...],
  flashcards: [...]
}
```

### Unidades

Cada unidad incluye:

- `code`;
- `title`;
- `position`;
- `estimatedMinutes` entre 1 y 30;
- `studySummary` no vacío;
- `examKeys`;
- `confusions`;
- `traps`;
- `mnemonics`;
- al menos una `sourceRef` validada;
- opcionalmente `sourceSubtopicName` como pista para relacionarla con la estructura antigua.

La unidad es material para estudiar, no evidencia de dominio.

### Conceptos

Cada concepto declara:

- código estable;
- unidad canónica;
- título;
- descripción;
- posición.

Un concepto solo pertenece a una unidad canónica, aunque pueda relacionarse con varias preguntas y cards.

### Mapeo de preguntas

Cada fila usa el código real de la pregunta existente:

```ts
{
  questionCode: "SMS-T18-0003",
  primaryConceptCode: "SMS-T18-C01",
  secondaryConceptCodes: ["SMS-T18-C02"]
}
```

Una pregunta aparece como máximo una vez en el paquete y declara un único concepto primario. Los secundarios son opcionales.

El concepto primario es la atribución ordinaria del historial. Los secundarios no multiplican automáticamente la evidencia.

### Flashcards

Cada card incluye:

- código estable;
- concepto;
- tipo;
- pregunta/prompt;
- respuesta;
- posición;
- referencias opcionales propias, además de las fuentes de su unidad.

Tipos iniciales:

- `direct`;
- `contrast`;
- `number_or_deadline`;
- `exception`;
- `mini_case`.

## Validación previa a importación

`validateV4StudyContentPackage()` revisa antes de cualquier escritura:

- versión de contrato;
- oposición y tema;
- códigos duplicados;
- unidades sin resumen o sin fuente;
- conceptos que apuntan a unidades inexistentes;
- preguntas con mapeos duplicados;
- conceptos primarios/secundarios inexistentes;
- cards con conceptos inexistentes;
- referencias y campos mínimos;
- conceptos sin cards;
- conceptos sin preguntas primarias;
- cobertura primaria insuficiente.

Los errores estructurales hacen `valid = false`.

Los huecos de cobertura son warnings deliberados: el paquete puede revisarse y el Generador puede proponer preguntas adicionales, pero ese concepto no está preparado para demostrar dominio completo mientras siga por debajo del umbral.

## Contrato de cobertura

El auditor utiliza exactamente el mismo umbral que el motor de dominio:

- mínimo 4 preguntas primarias distintas por concepto para soportar `Consolidando`.

Un concepto con 0–3 preguntas primarias se marca `coverage_gap`.

Las asociaciones secundarias no cuentan para satisfacer este mínimo.

## Flujo del Generador

1. Recibir fuente oficial/validada y metadatos actuales del tema.
2. Proponer unidades pequeñas.
3. Proponer conceptos canónicos.
4. Generar resumen, claves, confusiones, trampas y cards.
5. Asociar las preguntas existentes mediante `questions.codigo`.
6. Ejecutar validador y auditor de cobertura.
7. Proponer preguntas adicionales cuando haya huecos.
8. Revisión humana.
9. Solo el paquete aprobado puede pasar al importador.

## Por qué no importamos directamente desde IA

El contenido jurídico y la clasificación conceptual condicionarán la planificación, el repaso y la medición de conocimiento. Un error de generación podría enseñar, medir y recomendar mal a la vez.

Por eso el flujo separa claramente:

`generar → validar → revisar → importar`.

## Piloto

Los primeros paquetes se prepararán para los temas 13, 18 y 19 de Auxiliar Administrativo SMS.

No se escala a los 24 temas hasta comprobar que el paquete permite cerrar correctamente el ciclo:

`fallo → concepto → unidad → repaso/cards → pregunta distinta → comprobación diferida`.
